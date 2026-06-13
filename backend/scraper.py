import re
import time
from playwright.sync_api import Page, sync_playwright

# Default class: derived from hall ticket 23RH1A0511 → prefix 23RH1A05, rolls 01–60
DEFAULT_CLASS = {
    "sample_ticket": "23RH1A0511",
    "prefix": "23RH1A05",
    "start_roll": 1,
    "end_roll": 60,
    "roll_digits": 2,
}
BASE = "https://mrecwexamcell.com"
MARKS_URL = f"{BASE}/StudentLogin/Student/overallMarks.aspx"
LOGIN_URL = f"{BASE}/Login.aspx"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def build_hall_ticket(prefix: str, roll: int, roll_digits: int = 2) -> str:
    return f"{prefix.strip().upper()}{roll:0{roll_digits}d}"


def infer_prefix(hall_ticket: str, roll_digits: int = 2) -> str:
    ticket = hall_ticket.strip().upper()
    if len(ticket) <= roll_digits:
        return ticket
    return ticket[:-roll_digits]


def login_and_fetch_marks(hall_ticket: str) -> dict:
    hall_ticket = hall_ticket.strip().upper()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()
        try:
            return _fetch_marks(page, hall_ticket, summary_only=False)
        finally:
            browser.close()


def fetch_class_results(
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int = 2,
    delay_sec: float = 1.5,
    summary_only: bool = True,
    on_progress=None,
) -> dict:
    prefix = prefix.strip().upper()
    if start_roll > end_roll:
        start_roll, end_roll = end_roll, start_roll

    tickets = [
        build_hall_ticket(prefix, roll, roll_digits)
        for roll in range(start_roll, end_roll + 1)
    ]

    students = []
    failed = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()

        try:
            for index, ticket in enumerate(tickets):
                if index > 0:
                    time.sleep(delay_sec)
                    context.clear_cookies()

                if on_progress:
                    on_progress(index + 1, len(tickets), ticket)

                try:
                    data = _fetch_marks(page, ticket, summary_only=summary_only)
                    if "error" in data:
                        failed.append({"hallTicket": ticket, "error": data["error"]})
                    else:
                        students.append(data)
                except Exception as exc:
                    failed.append({"hallTicket": ticket, "error": str(exc)})
        finally:
            browser.close()

    students.sort(key=lambda row: float(row.get("cgpa") or 0), reverse=True)

    cgpa_values = [float(s["cgpa"]) for s in students if s.get("cgpa")]
    class_avg = round(sum(cgpa_values) / len(cgpa_values), 2) if cgpa_values else None

    return {
        "prefix": prefix,
        "startRoll": start_roll,
        "endRoll": end_roll,
        "rollDigits": roll_digits,
        "totalAttempted": len(tickets),
        "successCount": len(students),
        "failedCount": len(failed),
        "classAverageCgpa": class_avg,
        "students": students,
        "failed": failed,
    }


def _fetch_marks(page: Page, hall_ticket: str, summary_only: bool = False) -> dict:
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
    if "CGPA" not in html:
        return {"error": "Results not available", "hallTicket": hall_ticket}

    return parse_marks_page(html, hall_ticket, summary_only=summary_only)


def parse_marks_page(html: str, hall_ticket: str, summary_only: bool = False) -> dict:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)

    result = {
        "hallTicket": hall_ticket,
        "studentName": None,
        "branch": None,
        "cgpa": None,
        "percentage": None,
        "creditsObtained": None,
        "creditsTotal": None,
        "subjectsDue": None,
        "subjectsTotal": None,
    }

    if not summary_only:
        result["subjects"] = []

    name_match = re.search(r"WELCOME\s+(.+?)\(\s*" + re.escape(hall_ticket), text, re.I)
    if name_match:
        result["studentName"] = name_match.group(1).strip()

    branch_match = re.search(r"B\.TECH[^,]*,\s*([^,0-9]+)", text, re.I)
    if branch_match:
        result["branch"] = branch_match.group(1).strip()

    cgpa_match = re.search(r"CGPA:\s*([\d.]+)", text)
    if cgpa_match:
        result["cgpa"] = cgpa_match.group(1)

    pct_match = re.search(r"Percentage\s*:\s*([\d.]+%?)", text)
    if pct_match:
        result["percentage"] = pct_match.group(1)

    credits_match = re.search(r"Credits Obtained\s*([\d.]+)/([\d.]+)", text)
    if credits_match:
        result["creditsObtained"] = credits_match.group(1)
        result["creditsTotal"] = credits_match.group(2)

    due_match = re.search(r"Subject Due:\s*(\d+)/(\d+)", text)
    if due_match:
        result["subjectsDue"] = due_match.group(1)
        result["subjectsTotal"] = due_match.group(2)

    if summary_only:
        return result

    seen = set()
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cells) < 5 or not cells[0].isdigit():
                continue
            code = cells[1]
            if not code or code in ("Code", "SGPA") or not re.match(r"^[A-Z0-9]{6,12}$", code):
                continue
            key = (cells[0], code)
            if key in seen:
                continue
            seen.add(key)

            grades = []
            for cell in cells[3:]:
                if re.match(r"^[A-F][+]?$|^O$|^AB$", cell):
                    grades.append(cell)
                elif cell in ("", "P", "F"):
                    break
                else:
                    break

            status = next((c for c in reversed(cells) if c in ("P", "F")), "")
            credits = ""
            for cell in reversed(cells):
                if re.match(r"^\d+\.?\d*$", cell) and cell != cells[0] and cell not in ("P", "F"):
                    credits = cell
                    break

            result["subjects"].append({
                "sno": cells[0],
                "code": code,
                "name": cells[2],
                "grades": grades,
                "credits": credits,
                "status": status,
            })

    return result


def is_backlog_subject(subject: dict) -> bool:
    status = (subject.get("status") or "").upper()
    if status == "F":
        return True
    grades = subject.get("grades") or []
    return any(str(g).upper() == "F" for g in grades)


def extract_backlogs(data: dict) -> list:
    return [s for s in (data.get("subjects") or []) if is_backlog_subject(s)]


def build_backlog_report(data: dict) -> dict:
    backlogs = extract_backlogs(data)
    return {
        "hallTicket": data.get("hallTicket"),
        "studentName": data.get("studentName"),
        "branch": data.get("branch"),
        "cgpa": data.get("cgpa"),
        "creditsObtained": data.get("creditsObtained"),
        "creditsTotal": data.get("creditsTotal"),
        "subjectsDue": data.get("subjectsDue"),
        "subjectsTotal": data.get("subjectsTotal"),
        "backlogCount": len(backlogs),
        "backlogs": backlogs,
    }


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_result_contrast(data_a: dict, data_b: dict) -> dict:
    backlogs_a = extract_backlogs(data_a)
    backlogs_b = extract_backlogs(data_b)

    cgpa_a = _parse_float(data_a.get("cgpa"))
    cgpa_b = _parse_float(data_b.get("cgpa"))
    cgpa_diff = round(cgpa_a - cgpa_b, 2) if cgpa_a is not None and cgpa_b is not None else None

    credits_a = _parse_float(data_a.get("creditsObtained"))
    credits_b = _parse_float(data_b.get("creditsObtained"))
    credits_diff = round(credits_a - credits_b, 2) if credits_a is not None and credits_b is not None else None

    def summary(data, backlog_count):
        return {
            "hallTicket": data.get("hallTicket"),
            "studentName": data.get("studentName"),
            "branch": data.get("branch"),
            "cgpa": data.get("cgpa"),
            "creditsObtained": data.get("creditsObtained"),
            "creditsTotal": data.get("creditsTotal"),
            "subjectsDue": data.get("subjectsDue"),
            "subjectsTotal": data.get("subjectsTotal"),
            "backlogCount": backlog_count,
        }

    return {
        "first": summary(data_a, len(backlogs_a)),
        "second": summary(data_b, len(backlogs_b)),
        "comparison": {
            "cgpaDifference": cgpa_diff,
            "creditsDifference": credits_diff,
            "backlogCountFirst": len(backlogs_a),
            "backlogCountSecond": len(backlogs_b),
            "metrics": [
                {
                    "label": "CGPA",
                    "first": data_a.get("cgpa"),
                    "second": data_b.get("cgpa"),
                },
                {
                    "label": "Credits",
                    "first": _credits_label(data_a),
                    "second": _credits_label(data_b),
                },
                {
                    "label": "Subjects Due",
                    "first": data_a.get("subjectsDue"),
                    "second": data_b.get("subjectsDue"),
                },
                {
                    "label": "Backlogs",
                    "first": len(backlogs_a),
                    "second": len(backlogs_b),
                },
            ],
        },
    }


def _credits_label(data: dict) -> str:
    obtained = data.get("creditsObtained")
    total = data.get("creditsTotal")
    if obtained and total:
        return f"{obtained}/{total}"
    return obtained or total or "—"


def fetch_backlog_report(hall_ticket: str) -> dict:
    data = login_and_fetch_marks(hall_ticket)
    if "error" in data:
        return data
    return build_backlog_report(data)


def fetch_result_contrast(ticket_a: str, ticket_b: str) -> dict:
    ticket_a = ticket_a.strip().upper()
    ticket_b = ticket_b.strip().upper()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()
        try:
            data_a = _fetch_marks(page, ticket_a, summary_only=False)
            if "error" in data_a:
                return data_a

            time.sleep(1)
            context.clear_cookies()

            data_b = _fetch_marks(page, ticket_b, summary_only=False)
            if "error" in data_b:
                return data_b

            return build_result_contrast(data_a, data_b)
        finally:
            browser.close()


if __name__ == "__main__":
    import json
    import os
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "class":
        cfg = DEFAULT_CLASS
        prefix = sys.argv[2] if len(sys.argv) > 2 else cfg["prefix"]
        start = int(sys.argv[3]) if len(sys.argv) > 3 else cfg["start_roll"]
        end = int(sys.argv[4]) if len(sys.argv) > 4 else cfg["end_roll"]
        result = fetch_class_results(prefix, start, end, cfg["roll_digits"])
        out_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, "class_results.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"Saved {result['successCount']} students to {out}")
        print(json.dumps(result, indent=2))
    else:
        print(json.dumps(login_and_fetch_marks("23RH1A0511"), indent=2))
