"""Scrape semester-wise overall marks from MRECW exam cell portal."""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup
from playwright.sync_api import Page, sync_playwright

from scraper import MARKS_URL, USER_AGENT, parse_marks_page

BASE = "https://mrecwexamcell.com"
SEMWISE_MARKS_URL = f"{BASE}/StudentLogin/Student/OverallMarksSemwise.aspx"
MARKS_PAGE_URL = f"{BASE}/StudentLogin/Student/overallMarks.aspx"
SOURCE_URL = SEMWISE_MARKS_URL
MARKS_PANEL_ID = "ctl00_cpStud_pnMarks"
SEMESTER_PATTERN = re.compile(r"^[IVX/]+\s+[IVX]+\s+SEM$", re.I)


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


def _parse_subject_row(cells: list[str]) -> dict[str, Any] | None:
    if len(cells) < 5 or not cells[0].isdigit():
        return None

    code = cells[1].strip()
    if not code or not re.match(r"^[A-Z0-9]{6,12}$", code):
        return None

    grades = []
    for cell in cells[3:15]:
        if re.match(r"^[A-F][+]?$|^O$|^AB$", cell):
            grades.append(cell)
        elif cell in ("", "P", "F"):
            break
        else:
            break

    status = next((c for c in reversed(cells) if c in ("P", "F")), "")
    credits = ""
    for cell in reversed(cells):
        if re.match(r"^\d+\.?\d*$", cell) and cell != cells[0] and cell not in ("P", "F", "0"):
            credits = cell
            break
    if not credits and len(cells) > 16:
        credits = cells[16]

    return {
        "sno": cells[0],
        "code": code,
        "name": cells[2].strip(),
        "grades": grades,
        "credits": credits,
        "status": status,
    }


def parse_semwise_marks_page(html: str, hall_ticket: str) -> dict[str, Any]:
    summary = parse_marks_page(html, hall_ticket, summary_only=True)
    profile = _parse_student_header(html, hall_ticket)
    soup = BeautifulSoup(html, "html.parser")

    panel = soup.find("div", id=MARKS_PANEL_ID)
    tables = panel.find_all("table") if panel else []

    semesters: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for table in tables:
        for row in table.find_all("tr"):
            cells = [cell.get_text(strip=True) for cell in row.find_all("td")]
            if len(cells) < 3:
                continue

            subject_cell = cells[2]

            if (
                not cells[0].isdigit()
                and not cells[1]
                and "SEM" in subject_cell.upper()
                and "/" in subject_cell
            ):
                current = {
                    "semester": subject_cell.strip(),
                    "examMonth": cells[3].strip() if len(cells) > 3 and cells[3].strip() else None,
                    "subjects": [],
                    "sgpa": None,
                    "cgpa": None,
                    "totalCredits": None,
                    "subjectsPassed": None,
                }
                semesters.append(current)
                continue

            sgpa_match = re.search(r"SGPA:\s*([\d.]+).*?CGPA:\s*([\d.]+)", subject_cell, re.I)
            if sgpa_match and current is not None:
                current["sgpa"] = round(float(sgpa_match.group(1)), 2)
                current["cgpa"] = round(float(sgpa_match.group(2)), 2)
                if len(cells) > 16 and re.match(r"^\d+\.?\d*$", cells[16]):
                    current["totalCredits"] = cells[16]
                continue

            passed_match = re.search(r"Subjects Passed:\s*(\d+)", subject_cell, re.I)
            if passed_match and current is not None:
                current["subjectsPassed"] = int(passed_match.group(1))
                continue

            subject = _parse_subject_row(cells)
            if subject and current is not None:
                current["subjects"].append(subject)

    if not semesters:
        return {
            **profile,
            **{k: v for k, v in summary.items() if k not in profile},
            "sourceUrl": SOURCE_URL,
            "semesters": [],
            "message": "No semester-wise marks found for this student.",
        }

    return {
        **profile,
        **{k: v for k, v in summary.items() if k not in profile},
        "sourceUrl": SOURCE_URL,
        "semesters": semesters,
    }


def _login_and_open_marks(page: Page, hall_ticket: str) -> dict[str, Any] | None:
    hall_ticket = hall_ticket.strip().upper()
    page.goto(MARKS_URL, wait_until="networkidle", timeout=60000)
    page.fill("#txtUserName", hall_ticket)
    page.click("#btnNext")
    page.wait_for_load_state("networkidle")

    if page.locator("#txtPassword").count() == 0:
        return {"error": "Invalid hall ticket", "hallTicket": hall_ticket}

    page.fill("#txtPassword", hall_ticket)
    page.click("#btnSubmit")
    page.wait_for_load_state("networkidle")

    content = page.content()
    if hall_ticket not in content and "WELCOME" not in content.upper():
        return {"error": "Login failed", "hallTicket": hall_ticket}

    page.evaluate("__doPostBack('ctl00$cpStud$lnkOverallMarksSemwiseMarks','')")
    page.wait_for_url("**/overallMarks.aspx", timeout=60000)
    page.wait_for_load_state("networkidle")

    html = page.content()
    if MARKS_PANEL_ID not in html and "Overall Marks" not in html:
        return {"error": "Semester-wise marks not available", "hallTicket": hall_ticket}

    return None


def fetch_student_semwise_marks(hall_ticket: str) -> dict[str, Any]:
    hall_ticket = hall_ticket.strip().upper()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()
        try:
            err = _login_and_open_marks(page, hall_ticket)
            if err:
                return err
            return parse_semwise_marks_page(page.content(), hall_ticket)
        finally:
            browser.close()
