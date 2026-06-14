"""Scrape semester-wise overall result (SGPA/CGPA) from MRECW exam cell portal."""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup
from playwright.sync_api import Page, sync_playwright

from scraper import BASE, MARKS_URL, USER_AGENT

OVERALL_RESULT_URL = f"{BASE}/StudentLogin/Student/OverallResultStudent.aspx"
SOURCE_URL = OVERALL_RESULT_URL
RESULT_TABLE_ID = "ctl00_cpStud_grdOverall"


def _parse_float(value: str) -> float | None:
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


def parse_overall_result_page(html: str, hall_ticket: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id=RESULT_TABLE_ID)
    if not table:
        return {"error": "Overall result not available", "hallTicket": hall_ticket}

    profile = _parse_student_header(html, hall_ticket)
    semesters: list[dict[str, Any]] = []

    for row in table.find_all("tr"):
        cells = [cell.get_text(strip=True) for cell in row.find_all("td")]
        if len(cells) < 4:
            continue

        sno, semester, sgpa_raw, cgpa_raw = cells[:4]
        attendance_raw = cells[4] if len(cells) > 4 else ""

        if not semester or semester.lower() in ("sem", "sno"):
            continue
        if "SEM" not in semester.upper():
            continue

        semesters.append({
            "sno": sno or None,
            "semester": semester,
            "sgpa": _parse_float(sgpa_raw),
            "cgpa": _parse_float(cgpa_raw),
            "semesterEndAttendance": _parse_float(attendance_raw),
        })

    if not semesters:
        return {
            **profile,
            "sourceUrl": SOURCE_URL,
            "semesters": [],
            "latestCgpa": None,
            "latestSemester": None,
            "message": "No overall result records found for this student.",
        }

    current_semester = profile.get("currentSemester")
    matched = next((row for row in semesters if row.get("semester") == current_semester), None)

    if matched and matched.get("cgpa") is not None:
        latest_semester = matched.get("semester")
        latest_cgpa = matched.get("cgpa")
    else:
        def _sno_key(row: dict[str, Any]) -> int:
            try:
                return int(str(row.get("sno") or "999"))
            except ValueError:
                return 999

        latest_row = min(semesters, key=_sno_key)
        latest_semester = latest_row.get("semester")
        latest_cgpa = latest_row.get("cgpa")

    return {
        **profile,
        "sourceUrl": SOURCE_URL,
        "semesters": semesters,
        "latestCgpa": latest_cgpa,
        "latestSemester": latest_semester,
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


def _fetch_overall_result(page: Page, hall_ticket: str) -> dict[str, Any]:
    page.goto(OVERALL_RESULT_URL, wait_until="networkidle", timeout=60000)
    html = page.content()

    if RESULT_TABLE_ID not in html and "OverAll Result" not in html:
        return {"error": "Overall result page not available", "hallTicket": hall_ticket}

    return parse_overall_result_page(html, hall_ticket)


def fetch_student_overall_result(hall_ticket: str) -> dict[str, Any]:
    hall_ticket = hall_ticket.strip().upper()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()
        try:
            if not _login_student(page, hall_ticket):
                return {"error": "Invalid hall ticket", "hallTicket": hall_ticket}
            return _fetch_overall_result(page, hall_ticket)
        finally:
            browser.close()
