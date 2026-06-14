"""Scrape external / exam hall tickets from MRECW exam cell portal."""

from __future__ import annotations

import os
import re
import tempfile
import time
from typing import Any

from bs4 import BeautifulSoup
from playwright.sync_api import Page, sync_playwright

from scraper import BASE, LOGIN_URL, USER_AGENT

HALL_TICKET_DOWNLOAD_URL = f"{BASE}/StudentLogin/Student/StudentHallTicketDownload.aspx"
OFFICIAL_PORTAL_URL = HALL_TICKET_DOWNLOAD_URL

EXAM_TYPE_SELECT = "#ctl00_cpStud_ddExamType"
SEMESTER_SELECT = "#ctl00_cpStud_ddSemester"
MONTH_YEAR_SELECT = "#ctl00_cpStud_ddMonthYear"
DOWNLOAD_BUTTON = "#ctl00_cpStud_btnDownload"


def _login_student(page: Page, hall_ticket: str) -> bool:
    hall_ticket = hall_ticket.strip().upper()
    page.goto(LOGIN_URL, wait_until="networkidle", timeout=60000)
    page.fill("#txtUserName", hall_ticket)
    page.click("#btnNext")
    page.wait_for_load_state("networkidle")

    if page.locator("#txtPassword").count() == 0:
        return False

    page.fill("#txtPassword", hall_ticket)
    page.click("#btnSubmit")
    page.wait_for_load_state("networkidle")
    return True


def _read_select_options(page: Page, selector: str) -> list[dict[str, str]]:
    options = []
    for opt in page.locator(f"{selector} option").all():
        value = (opt.get_attribute("value") or "").strip()
        label = (opt.inner_text() or "").strip()
        if not value or value in ("0", "-1", ""):
            continue
        options.append({"value": value, "label": label or value})
    return options


def _parse_student_header(html: str, hall_ticket: str) -> dict[str, str | None]:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)

    profile = {
        "hallTicket": hall_ticket,
        "studentName": None,
        "branch": None,
        "program": None,
    }

    name_match = re.search(
        r"WELCOME\s+(.+?)\(\s*" + re.escape(hall_ticket) + r"\s*\)",
        text,
        re.I,
    )
    if name_match:
        profile["studentName"] = name_match.group(1).strip()

    program_match = re.search(
        r"B\.TECH[^,]*,\s*([^,0-9]+?)(?:,\s*[^,]+)?(?:\s+\d{4})?",
        text,
        re.I,
    )
    if program_match:
        profile["branch"] = program_match.group(1).strip()

    btech_match = re.search(r"(B\.TECH[^0-9]{0,80})", text, re.I)
    if btech_match:
        profile["program"] = btech_match.group(1).strip()

    return profile


def _parse_hall_ticket_text(text: str) -> dict[str, Any]:
    details: dict[str, Any] = {
        "hallTicketNumber": None,
        "examDate": None,
        "examCenter": None,
        "subjects": [],
        "rawText": text[:4000] if text else "",
    }

    ht_match = re.search(r"Hall\s*Ticket\s*(?:No|Number)?\s*[:\.]?\s*([A-Z0-9]+)", text, re.I)
    if ht_match:
        details["hallTicketNumber"] = ht_match.group(1).strip()

    date_match = re.search(
        r"(?:Exam\s*Date|Date\s*of\s*Exam|Date)\s*[:\.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})",
        text,
        re.I,
    )
    if date_match:
        details["examDate"] = date_match.group(1).strip()

    center_match = re.search(r"(?:Exam\s*Center|Centre|Center)\s*[:\.]?\s*(.+?)(?:\n|Exam|Subject|$)", text, re.I)
    if center_match:
        details["examCenter"] = center_match.group(1).strip()[:200]

    subject_codes = re.findall(r"\b([A-Z]{2,4}\d{3,4}[A-Z]?)\b", text)
    if subject_codes:
        details["subjects"] = sorted(set(subject_codes))

    return details


def _extract_pdf_text(path: str) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(path)
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        return ""


def _try_download_ticket(page: Page, context) -> dict[str, Any] | None:
    """Attempt download / popup and return parsed ticket details."""
    html_before = page.content()

    # Popup window with hall ticket HTML
    try:
        with context.expect_page(timeout=8000) as popup_info:
            page.click(DOWNLOAD_BUTTON)
        popup = popup_info.value
        popup.wait_for_load_state("networkidle", timeout=30000)
        popup_html = popup.content()
        popup_text = BeautifulSoup(popup_html, "html.parser").get_text("\n", strip=True)
        popup.close()
        if len(popup_text) > 40:
            return _parse_hall_ticket_text(popup_text)
    except Exception:
        pass

    # File download (PDF)
    try:
        with page.expect_download(timeout=8000) as download_info:
            page.click(DOWNLOAD_BUTTON)
        download = download_info.value
        suffix = os.path.splitext(download.suggested_filename or "ticket.pdf")[1] or ".pdf"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            path = tmp.name
        download.save_as(path)
        try:
            if suffix.lower() == ".pdf":
                text = _extract_pdf_text(path)
            else:
                with open(path, encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            if text.strip():
                return _parse_hall_ticket_text(text)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
    except Exception:
        pass

    # Same-page HTML update after click
    try:
        page.click(DOWNLOAD_BUTTON)
        page.wait_for_load_state("networkidle", timeout=15000)
        html_after = page.content()
        if html_after != html_before:
            text = BeautifulSoup(html_after, "html.parser").get_text("\n", strip=True)
            if "hall ticket" in text.lower() or "exam" in text.lower():
                return _parse_hall_ticket_text(text)
    except Exception:
        pass

    return None


def _collect_exam_sessions(page: Page, context) -> list[dict[str, Any]]:
    sessions: list[dict[str, Any]] = []
    exam_types = _read_select_options(page, EXAM_TYPE_SELECT)

    if not exam_types:
        return sessions

    for exam in exam_types:
        page.select_option(EXAM_TYPE_SELECT, exam["value"])
        page.wait_for_load_state("networkidle")
        semesters = _read_select_options(page, SEMESTER_SELECT)

        if not semesters:
            sessions.append({
                "examType": exam["label"],
                "examTypeValue": exam["value"],
                "semester": None,
                "semesterValue": None,
                "monthYear": None,
                "monthYearValue": None,
                "details": None,
            })
            continue

        for sem in semesters:
            page.select_option(SEMESTER_SELECT, sem["value"])
            page.wait_for_load_state("networkidle")
            months = _read_select_options(page, MONTH_YEAR_SELECT)

            if not months:
                sessions.append({
                    "examType": exam["label"],
                    "examTypeValue": exam["value"],
                    "semester": sem["label"],
                    "semesterValue": sem["value"],
                    "monthYear": None,
                    "monthYearValue": None,
                    "details": None,
                })
                continue

            for month in months:
                page.select_option(MONTH_YEAR_SELECT, month["value"])
                page.wait_for_load_state("networkidle")

                entry: dict[str, Any] = {
                    "examType": exam["label"],
                    "examTypeValue": exam["value"],
                    "semester": sem["label"],
                    "semesterValue": sem["value"],
                    "monthYear": month["label"],
                    "monthYearValue": month["value"],
                    "details": None,
                }

                details = _try_download_ticket(page, context)
                if details:
                    entry["details"] = details

                sessions.append(entry)
                time.sleep(0.5)

    return sessions


def fetch_exam_hall_tickets(hall_ticket: str) -> dict[str, Any]:
    hall_ticket = hall_ticket.strip().upper()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT, accept_downloads=True)
        page = context.new_page()

        try:
            if not _login_student(page, hall_ticket):
                return {"error": "Invalid hall ticket", "hallTicket": hall_ticket}

            page.goto(HALL_TICKET_DOWNLOAD_URL, wait_until="networkidle", timeout=60000)
            html = page.content()

            if "Exam Hall Ticket Downloading" not in html and "ddExamType" not in html:
                return {"error": "Exam hall ticket page not available", "hallTicket": hall_ticket}

            profile = _parse_student_header(html, hall_ticket)
            sessions = _collect_exam_sessions(page, context)

            tickets = []
            for session in sessions:
                details = session.get("details") or {}
                tickets.append({
                    "examType": session.get("examType"),
                    "semester": session.get("semester"),
                    "monthYear": session.get("monthYear"),
                    "hallTicketNumber": details.get("hallTicketNumber") or hall_ticket,
                    "examDate": details.get("examDate"),
                    "examCenter": details.get("examCenter"),
                    "subjects": details.get("subjects") or [],
                    "rawText": details.get("rawText") or "",
                })

            return {
                **profile,
                "sourceUrl": OFFICIAL_PORTAL_URL,
                "sessionsFound": len(sessions),
                "tickets": tickets,
                "message": (
                    "No external exam hall tickets are published for this student right now."
                    if not sessions
                    else None
                ),
            }
        finally:
            browser.close()
