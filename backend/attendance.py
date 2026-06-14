"""Scrape overall semester attendance from MRECW exam cell portal."""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup
from playwright.sync_api import Page, sync_playwright

from scraper import BASE, MARKS_URL, USER_AGENT

ATTENDANCE_URL = f"{BASE}/StudentLogin/Student/StudentOverallAttendance.aspx"
SOURCE_URL = ATTENDANCE_URL
ATTENDANCE_TABLE_ID = "ctl00_cpStud_grdOverallAtt"

MONTHS = {
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
}


def _parse_number(value: str) -> int | None:
    value = (value or "").strip().replace(",", "")
    if not value or value in ("&nbsp;", "—", "-"):
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def _parse_percentage(value: str) -> float | None:
    value = (value or "").strip().replace("%", "")
    if not value or value in ("&nbsp;", "—", "-"):
        return None
    try:
        return round(float(value), 2)
    except ValueError:
        return None


def _parse_student_header(html: str, hall_ticket: str) -> dict[str, str | None]:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)

    profile: dict[str, str | None] = {
        "hallTicket": hall_ticket,
        "studentName": None,
        "branch": None,
        "program": None,
        "currentSemester": None,
    }

    name_match = re.search(
        r"WELCOME\s+(.+?)\(\s*" + re.escape(hall_ticket) + r"\s*\)",
        text,
        re.I,
    )
    if name_match:
        profile["studentName"] = name_match.group(1).strip()

    branch_match = re.search(r"B\.TECH[^,]*,\s*([^,0-9]+)", text, re.I)
    if branch_match:
        profile["branch"] = branch_match.group(1).strip()

    program_match = re.search(r"(B\.TECH[^0-9]{0,80})", text, re.I)
    if program_match:
        profile["program"] = program_match.group(1).strip()

    semester_match = re.search(
        r"B\.TECH[^,]*,\s*[^,]+,\s*([^,]+),\s*\d{4}",
        text,
        re.I,
    )
    if semester_match:
        profile["currentSemester"] = semester_match.group(1).strip()

    return profile


def parse_attendance_page(html: str, hall_ticket: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id=ATTENDANCE_TABLE_ID)
    if not table:
        return {"error": "Attendance not available", "hallTicket": hall_ticket}

    profile = _parse_student_header(html, hall_ticket)
    semesters: list[dict[str, Any]] = []
    current_group: dict[str, Any] | None = None
    current_semester: str | None = None

    for row in table.find_all("tr"):
        cells = [cell.get_text(strip=True) for cell in row.find_all("td")]
        if len(cells) < 5:
            continue

        month, semester, conducted_raw, attended_raw, perc_raw = cells[:5]

        if month.lower() == "total":
            if current_group is not None:
                current_group["summary"] = {
                    "conducted": _parse_number(conducted_raw),
                    "attended": _parse_number(attended_raw),
                    "percentage": _parse_percentage(perc_raw),
                }
            continue

        if month.upper() not in MONTHS:
            continue

        semester = semester.strip() or current_semester
        if not semester:
            continue

        if semester != current_semester:
            current_semester = semester
            current_group = {
                "semester": semester,
                "months": [],
                "summary": None,
            }
            semesters.append(current_group)

        current_group["months"].append({
            "month": month.upper(),
            "conducted": _parse_number(conducted_raw),
            "attended": _parse_number(attended_raw),
            "percentage": _parse_percentage(perc_raw),
        })

    if not semesters:
        return {
            **profile,
            "sourceUrl": SOURCE_URL,
            "semesters": [],
            "overallPercentage": None,
            "message": "No attendance records found for this student.",
        }

    current_semester_label = profile.get("currentSemester")
    matched = next(
        (group for group in semesters if group.get("semester") == current_semester_label),
        None,
    )
    overall = (matched.get("summary") or {}).get("percentage") if matched else None

    return {
        **profile,
        "sourceUrl": SOURCE_URL,
        "semesters": semesters,
        "overallPercentage": overall,
        "activeSemester": current_semester_label,
        "currentSemesterAvailable": matched is not None,
    }


def _login_student(page: Page, hall_ticket: str) -> bool:
    hall_ticket = hall_ticket.strip().upper()
    page.goto(MARKS_URL, wait_until="networkidle", timeout=60000)
    page.fill("#txtUserName", hall_ticket)
    page.click("#btnNext")
    page.wait_for_load_state("networkidle")

    if page.locator("#txtPassword").count() == 0:
        return False

    page.fill("#txtPassword", hall_ticket)
    page.click("#btnSubmit")
    page.wait_for_load_state("networkidle")
    return True


def _fetch_attendance(page: Page, hall_ticket: str) -> dict[str, Any]:
    page.goto(ATTENDANCE_URL, wait_until="networkidle", timeout=60000)
    html = page.content()

    if ATTENDANCE_TABLE_ID not in html and "OverAll Semester Attendance" not in html:
        return {"error": "Attendance page not available", "hallTicket": hall_ticket}

    return parse_attendance_page(html, hall_ticket)


def fetch_student_attendance(hall_ticket: str) -> dict[str, Any]:
    hall_ticket = hall_ticket.strip().upper()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()
        try:
            if not _login_student(page, hall_ticket):
                return {"error": "Invalid hall ticket", "hallTicket": hall_ticket}
            return _fetch_attendance(page, hall_ticket)
        finally:
            browser.close()
