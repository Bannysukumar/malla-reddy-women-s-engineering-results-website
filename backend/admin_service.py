"""Admin dashboard stats and bulk scrape orchestration for all portal data types."""

from __future__ import annotations

import json
import logging
import threading
from typing import Any, Callable

from firebase_cache import (
    data_differ,
    get_admin_stats,
    get_cached_attendance,
    get_cached_class,
    get_cached_exam_hall_tickets,
    get_cached_overall_result,
    get_cached_result,
    get_cached_semwise_marks,
    init_firebase,
    is_enabled,
    list_all_class_sections,
    list_all_stored_tickets,
    log_search,
    save_attendance,
    save_class_result,
    save_exam_hall_tickets,
    save_overall_result,
    save_result,
    save_semwise_marks,
)
from scraper import fetch_class_results, login_and_fetch_marks
from attendance import fetch_student_attendance
from overall_result import fetch_student_overall_result
from semwise_marks import fetch_student_semwise_marks
from exam_hall_ticket import fetch_exam_hall_tickets

logger = logging.getLogger(__name__)

SCRAPE_TYPES = (
    "results",
    "attendance",
    "overall-result",
    "semwise-marks",
    "exam-hall-tickets",
    "class-results",
)

_scrape_locks = {key: threading.Lock() for key in SCRAPE_TYPES}
_scrape_running = {key: False for key in SCRAPE_TYPES}

# Backward compatibility with existing hard-scrape checks
_hard_scrape_lock = _scrape_locks["results"]


def is_hard_scrape_running() -> bool:
    return _scrape_running.get("results", False)


def is_scrape_running(job_type: str | None = None) -> bool:
    if job_type:
        return _scrape_running.get(job_type, False)
    return any(_scrape_running.values())


def track_search(hall_ticket: str) -> None:
    init_firebase()
    log_search(hall_ticket)


def fetch_admin_stats() -> dict:
    init_firebase()
    stats = get_admin_stats()
    stats["hardScrapeRunning"] = _scrape_running.get("results", False)
    stats["bulkScrapeRunning"] = {key: _scrape_running.get(key, False) for key in SCRAPE_TYPES}
    return stats


def _emit(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _list_class_sections() -> list[dict[str, Any]]:
    return list_all_class_sections()


def _student_scrape_handlers() -> dict[str, dict[str, Callable[..., dict]]]:
    return {
        "results": {
            "fetch": login_and_fetch_marks,
            "get_cached": lambda ticket: get_cached_result(ticket),
            "save": save_result,
        },
        "attendance": {
            "fetch": fetch_student_attendance,
            "get_cached": lambda ticket: get_cached_attendance(ticket),
            "save": save_attendance,
        },
        "overall-result": {
            "fetch": fetch_student_overall_result,
            "get_cached": lambda ticket: get_cached_overall_result(ticket),
            "save": save_overall_result,
        },
        "semwise-marks": {
            "fetch": fetch_student_semwise_marks,
            "get_cached": lambda ticket: get_cached_semwise_marks(ticket),
            "save": save_semwise_marks,
        },
        "exam-hall-tickets": {
            "fetch": fetch_exam_hall_tickets,
            "get_cached": lambda ticket: get_cached_exam_hall_tickets(ticket),
            "save": save_exam_hall_tickets,
        },
    }


def stream_hard_scrape():
    yield from stream_bulk_scrape("results")


def stream_bulk_scrape(job_type: str):
    job_type = (job_type or "").strip().lower()
    if job_type not in SCRAPE_TYPES:
        yield _emit({"type": "error", "message": f"Unknown scrape type: {job_type}"})
        return

    lock = _scrape_locks[job_type]
    if not lock.acquire(blocking=False):
        yield _emit({"type": "error", "message": f"{job_type} scrape already running"})
        return

    _scrape_running[job_type] = True

    try:
        init_firebase()
        if not is_enabled():
            yield _emit({"type": "error", "message": "Firebase is not configured"})
            return

        yield _emit({"type": "start", "jobType": job_type})

        if job_type == "class-results":
            yield from _stream_class_results_scrape()
        else:
            yield from _stream_student_ticket_scrape(job_type)
    finally:
        _scrape_running[job_type] = False
        lock.release()


def _stream_student_ticket_scrape(job_type: str):
    handlers = _student_scrape_handlers()[job_type]
    fetch_fn = handlers["fetch"]
    get_cached_fn = handlers["get_cached"]
    save_fn = handlers["save"]

    tickets = list_all_stored_tickets()
    total = len(tickets)
    yield _emit({"type": "progress", "current": 0, "total": total, "jobType": job_type})

    if total == 0:
        yield _emit({"type": "done", "jobType": job_type, "updated": 0, "unchanged": 0, "failed": 0, "total": 0})
        return

    updated = 0
    unchanged = 0
    failed = 0

    for index, ticket in enumerate(tickets):
        yield _emit({
            "type": "progress",
            "current": index + 1,
            "total": total,
            "hallTicket": ticket,
            "jobType": job_type,
        })

        try:
            cached = get_cached_fn(ticket)
            fresh = fetch_fn(ticket)

            if "error" in fresh:
                failed += 1
                yield _emit({"type": "failed", "hallTicket": ticket, "error": fresh.get("error"), "jobType": job_type})
                continue

            cached_data = cached.get("data") if cached else None
            if cached_data and not data_differ(cached_data, fresh):
                unchanged += 1
                yield _emit({"type": "unchanged", "hallTicket": ticket, "jobType": job_type})
                continue

            save_fn(ticket, fresh)
            updated += 1
            yield _emit({
                "type": "updated",
                "hallTicket": ticket,
                "studentName": fresh.get("studentName"),
                "jobType": job_type,
            })
        except Exception as exc:
            failed += 1
            logger.exception("%s scrape failed for %s: %s", job_type, ticket, exc)
            yield _emit({"type": "failed", "hallTicket": ticket, "error": str(exc), "jobType": job_type})

    yield _emit({
        "type": "done",
        "jobType": job_type,
        "total": total,
        "updated": updated,
        "unchanged": unchanged,
        "failed": failed,
    })


def _stream_class_results_scrape():
    sections = _list_class_sections()
    total = len(sections)
    yield _emit({"type": "progress", "current": 0, "total": total, "jobType": "class-results"})

    if total == 0:
        yield _emit({"type": "done", "jobType": "class-results", "updated": 0, "unchanged": 0, "failed": 0, "total": 0})
        return

    updated = 0
    unchanged = 0
    failed = 0

    for index, section in enumerate(sections):
        key = section["key"]
        prefix = section["prefix"]
        label = f"{prefix} ({section['startRoll']}-{section['endRoll']})"

        yield _emit({
            "type": "progress",
            "current": index + 1,
            "total": total,
            "hallTicket": label,
            "jobType": "class-results",
        })

        try:
            cached = get_cached_class(key)
            fresh = fetch_class_results(
                prefix,
                section["startRoll"],
                section["endRoll"],
                section["rollDigits"],
                delay_sec=1.5,
                summary_only=True,
            )

            if "error" in fresh:
                failed += 1
                yield _emit({"type": "failed", "hallTicket": label, "error": fresh.get("error"), "jobType": "class-results"})
                continue

            cached_data = cached.get("data") if cached else None
            if cached_data and not data_differ(cached_data, fresh):
                unchanged += 1
                yield _emit({"type": "unchanged", "hallTicket": label, "jobType": "class-results"})
                continue

            for student in fresh.get("students") or []:
                ticket = (student.get("hallTicket") or "").upper()
                if ticket:
                    save_result(ticket, student)
            fresh["scrapeStatus"] = "complete"
            save_class_result(key, fresh)
            updated += 1
            yield _emit({"type": "updated", "hallTicket": label, "jobType": "class-results"})
        except Exception as exc:
            failed += 1
            logger.exception("Class results scrape failed for %s: %s", label, exc)
            yield _emit({"type": "failed", "hallTicket": label, "error": str(exc), "jobType": "class-results"})

    yield _emit({
        "type": "done",
        "jobType": "class-results",
        "total": total,
        "updated": updated,
        "unchanged": unchanged,
        "failed": failed,
    })
