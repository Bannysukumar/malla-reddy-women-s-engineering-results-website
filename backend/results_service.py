"""Results fetch orchestration: Firebase cache + scraper refresh for all pages."""

from __future__ import annotations

import logging
import multiprocessing as mp
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable

from firebase_cache import (
    class_cache_key,
    contrast_cache_key,
    data_differ,
    get_cached_attendance,
    get_cached_backlog,
    get_cached_class,
    get_cached_contrast,
    get_cached_credits_contrast,
    get_cached_exam_hall_tickets,
    get_cached_overall_result,
    get_cached_result,
    get_cached_semwise_marks,
    init_firebase,
    is_enabled,
    save_attendance,
    save_class_result,
    save_contrast,
    save_credits_contrast,
    save_exam_hall_tickets,
    save_overall_result,
    save_result,
    save_semwise_marks,
    log_search,
    to_summary,
    to_class_student,
)
from scraper import (
    USER_AGENT,
    _fetch_marks,
    build_backlog_report,
    build_credits_contrast,
    build_hall_ticket,
    build_result_contrast,
    fetch_class_results,
    login_and_fetch_marks,
)
from exam_hall_ticket import fetch_exam_hall_tickets
from attendance import fetch_student_attendance
from overall_result import fetch_student_overall_result
from semwise_marks import fetch_student_semwise_marks

logger = logging.getLogger(__name__)

_refresh_in_progress: set[str] = set()
_refresh_guard = threading.Lock()
_class_scrape_jobs: dict[str, dict[str, Any]] = {}
_class_scrape_jobs_lock = threading.Lock()
_class_scrape_restart_at: dict[str, float] = {}
_CLASS_SCRAPE_STALE_SEC = int(os.getenv("CLASS_SCRAPE_STALE_SEC", "180"))
_CLASS_SCRAPE_RESTART_COOLDOWN_SEC = int(os.getenv("CLASS_SCRAPE_RESTART_COOLDOWN_SEC", "45"))
_playwright_pool_ctx = mp.get_context("spawn")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_age_seconds(iso_value: str | None) -> float | None:
    if not iso_value:
        return None
    try:
        normalized = iso_value.replace("Z", "+00:00")
        then = datetime.fromisoformat(normalized)
        if then.tzinfo is None:
            then = then.replace(tzinfo=timezone.utc)
        return max(0.0, (datetime.now(timezone.utc) - then).total_seconds())
    except ValueError:
        return None


def _cleanup_stale_class_job(key: str) -> None:
    with _class_scrape_jobs_lock:
        job = _class_scrape_jobs.get(key)
        if not job or job.get("status") != "running":
            return
        age = _iso_age_seconds(job.get("startedAt") or job.get("updatedAt"))
        if age is not None and age > _CLASS_SCRAPE_STALE_SEC:
            job["status"] = "failed"
            job["error"] = "Scrape timed out — restarted"
            job["updatedAt"] = _utc_now_iso()
            logger.warning("Marked stale in-memory class scrape as failed for %s", key)


def _acquire_class_scrape_lock(lock_name: str) -> bool:
    if _with_refresh_lock(lock_name):
        return True
    if is_class_scrape_running(lock_name.removeprefix("class-scrape:")):
        return False
    _release_refresh_lock(lock_name)
    return _with_refresh_lock(lock_name)


def _should_restart_class_scrape(key: str) -> bool:
    if is_class_scrape_running(key):
        return False
    return time.monotonic() - _class_scrape_restart_at.get(key, 0) >= _CLASS_SCRAPE_RESTART_COOLDOWN_SEC


def _ensure_class_scrape_running(
    key: str,
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int,
    delay_sec: float,
    *,
    force_refresh: bool = False,
) -> bool:
    _cleanup_stale_class_job(key)
    if not _should_restart_class_scrape(key):
        return False
    if not start_class_scrape(
        prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=force_refresh
    ):
        return False
    _class_scrape_restart_at[key] = time.monotonic()
    logger.info("Ensured class scrape running for %s", key)
    return True


def _class_job_push_event(key: str, event: dict[str, Any]) -> None:
    with _class_scrape_jobs_lock:
        job = _class_scrape_jobs.get(key)
        if job is not None:
            job["events"].append(event)


def get_class_scrape_job(key: str) -> dict[str, Any] | None:
    with _class_scrape_jobs_lock:
        job = _class_scrape_jobs.get(key)
        return dict(job) if job else None


def is_class_scrape_running(key: str) -> bool:
    with _class_scrape_jobs_lock:
        job = _class_scrape_jobs.get(key)
        if job and job.get("status") == "running":
            age = _iso_age_seconds(job.get("startedAt") or job.get("updatedAt"))
            if age is None or age < 3600:
                return True

    if is_enabled():
        cached = get_cached_class(key)
        if cached:
            data = cached.get("data") or {}
            if data.get("scrapeStatus") == "in_progress":
                age = _iso_age_seconds(cached.get("updatedAt"))
                if age is not None and age < _CLASS_SCRAPE_STALE_SEC:
                    return True
    return False


def _save_partial_class_result(
    key: str,
    students: list,
    failed: list,
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int,
    *,
    current: int,
    total: int,
    hall_ticket: str | None,
    cached_count: int | None = None,
) -> dict:
    result = finalize_class_result(students, failed, prefix, start_roll, end_roll, roll_digits)
    result["scrapeStatus"] = "in_progress"
    result["scrapeProgress"] = {
        "current": current,
        "total": total,
        "remaining": max(0, total - current),
        "cachedCount": cached_count if cached_count is not None else len(students),
        "hallTicket": hall_ticket,
    }
    if is_enabled():
        save_class_result(key, result)
    return result


def assemble_class_from_individual_cache(
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int,
) -> dict[str, Any]:
    """Load whatever student rows already exist in Firebase for this roll range only."""
    init_firebase()
    tickets = [build_hall_ticket(prefix, roll, roll_digits) for roll in range(start_roll, end_roll + 1)]
    students: list[dict] = []
    failed: list[dict] = []
    cached_count = 0

    if is_enabled():
        for ticket in tickets:
            cached = get_cached_result(ticket)
            if not cached:
                continue
            data = cached.get("data") or {}
            if "error" in data:
                failed.append({"hallTicket": ticket, "error": data.get("error") or "Invalid hall ticket"})
                cached_count += 1
                continue
            students.append(to_class_student(data))
            cached_count += 1

    total = len(tickets)
    resolved = len(students) + len(failed)
    return {
        "students": students,
        "failed": failed,
        "cachedCount": len(students),
        "resolvedCount": resolved,
        "total": total,
        "missingCount": total - resolved,
        "complete": resolved == total and total > 0,
    }


def tickets_for_range(prefix: str, start_roll: int, end_roll: int, roll_digits: int) -> set[str]:
    return {
        build_hall_ticket(prefix, roll, roll_digits)
        for roll in range(start_roll, end_roll + 1)
    }


def filter_class_result_to_range(
    data: dict[str, Any],
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int,
) -> dict[str, Any]:
    """Keep only rows inside the requested roll range (never return a wider stored section)."""
    allowed = tickets_for_range(prefix, start_roll, end_roll, roll_digits)
    students = [
        s for s in (data.get("students") or [])
        if (s.get("hallTicket") or "").upper() in allowed
    ]
    failed = [
        f for f in (data.get("failed") or [])
        if (f.get("hallTicket") or "").upper() in allowed
    ]
    total = end_roll - start_roll + 1
    resolved = len(students) + len(failed)
    result = finalize_class_result(students, failed, prefix, start_roll, end_roll, roll_digits)

    scrape_status = data.get("scrapeStatus")
    if scrape_status == "in_progress" or resolved < total:
        result["scrapeStatus"] = "in_progress"
        current = min(data.get("scrapeProgress", {}).get("current", resolved), total)
        result["scrapeProgress"] = {
            "current": current,
            "total": total,
            "remaining": max(0, total - resolved),
            "cachedCount": len(students),
            "hallTicket": data.get("scrapeProgress", {}).get("hallTicket"),
        }
    elif scrape_status == "complete":
        result["scrapeStatus"] = "complete"

    return result


def _class_range_needs_scrape(result: dict[str, Any]) -> bool:
    total = int(result.get("totalAttempted") or 0)
    resolved = int(result.get("successCount") or 0) + int(result.get("failedCount") or 0)
    return total > 0 and resolved < total


def _class_progress_from_result(result: dict[str, Any]) -> dict[str, Any]:
    total = int(result.get("totalAttempted") or 0)
    resolved = int(result.get("successCount") or 0) + int(result.get("failedCount") or 0)
    return {
        "current": resolved,
        "total": total,
        "remaining": max(0, total - resolved),
        "cachedCount": int(result.get("successCount") or 0),
        "hallTicket": None,
    }


def _class_scrape_workers() -> int:
    raw = os.getenv("CLASS_SCRAPE_WORKERS", "1")
    try:
        return max(1, min(int(raw), 6))
    except ValueError:
        return 1


def _scrape_pending_sequential(page, pending: list[str], handle_portal_result, context) -> None:
    delay = max(0.0, float(os.getenv("CLASS_SCRAPE_DELAY", "0.3")))
    for index, ticket in enumerate(pending):
        if index > 0:
            if delay > 0:
                time.sleep(delay)
            context.clear_cookies()
        try:
            data = _fetch_marks(page, ticket, summary_only=False, fast=True)
            handle_portal_result(ticket, data)
        except Exception as exc:
            handle_portal_result(ticket, {"error": str(exc), "hallTicket": ticket})


def _scrape_pending_parallel(pending: list[str], handle_portal_result, workers: int) -> None:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    with ThreadPoolExecutor(max_workers=min(workers, len(pending))) as pool:
        futures = {pool.submit(_scrape_one_class_ticket, ticket): ticket for ticket in pending}
        for future in as_completed(futures):
            ticket = futures[future]
            try:
                data = future.result()
            except Exception as exc:
                data = {"error": str(exc), "hallTicket": ticket}
            handle_portal_result(ticket, data)


def _scrape_one_class_ticket(ticket: str, *, summary_only: bool = False) -> dict:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()
        try:
            return _fetch_marks(page, ticket, summary_only=summary_only, fast=True)
        finally:
            browser.close()


def _resolve_cached_class_student(ticket: str, *, force_refresh: bool) -> dict | None:
    """Firebase-only lookup — never scrape here (class scrape handles pending tickets)."""
    if force_refresh or not is_enabled():
        return None
    cached = get_cached_result(ticket)
    if not cached:
        return None
    data = cached.get("data") or {}
    if "error" in data:
        return None
    return to_class_student(data)


def _execute_class_scrape(
    key: str,
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int,
    delay_sec: float,
    *,
    force_refresh: bool = False,
) -> None:
    init_firebase()
    total = end_roll - start_roll + 1
    tickets = [build_hall_ticket(prefix, roll, roll_digits) for roll in range(start_roll, end_roll + 1)]
    students: list[dict] = []
    failed: list[dict] = []
    cached_map: dict[str, dict] = {}

    if not force_refresh and is_enabled():
        class_doc = get_cached_class(key)
        if class_doc:
            for row in (class_doc.get("data") or {}).get("students") or []:
                ticket_key = (row.get("hallTicket") or "").upper()
                if ticket_key:
                    cached_map[ticket_key] = to_class_student(row)

        for ticket in tickets:
            if ticket in cached_map:
                continue
            cached = get_cached_result(ticket)
            if not cached:
                continue
            data = cached.get("data") or {}
            if "error" in data:
                continue
            cached_map[ticket] = to_class_student(data)

    cached_preload = len(cached_map)
    _class_job_push_event(key, {
        "type": "start",
        "total": total,
        "prefix": prefix,
        "cachedCount": cached_preload,
        "remaining": max(0, total - cached_preload),
    })

    all_cached = not force_refresh and cached_preload == total and total > 0

    try:
        if all_cached:
            for index, ticket in enumerate(tickets):
                student = cached_map[ticket]
                students.append(student)
                _class_job_push_event(key, {
                    "type": "progress",
                    "current": index + 1,
                    "total": total,
                    "remaining": max(0, total - (index + 1)),
                    "cachedCount": len(students),
                    "hallTicket": ticket,
                    "cached": True,
                })
                _class_job_push_event(key, {"type": "student", "student": student, "cached": True})
                _save_partial_class_result(
                    key, students, failed, prefix, start_roll, end_roll, roll_digits,
                    current=index + 1, total=total, hall_ticket=ticket, cached_count=len(students),
                )
        else:
            pending: list[str] = []
            resolved_count = 0

            def emit_progress(ticket: str, *, cached: bool = False) -> None:
                _class_job_push_event(key, {
                    "type": "progress",
                    "current": resolved_count,
                    "total": total,
                    "remaining": max(0, total - resolved_count),
                    "cachedCount": len(students),
                    "hallTicket": ticket,
                    "cached": cached,
                })

            def save_progress(ticket: str) -> None:
                _save_partial_class_result(
                    key, students, failed, prefix, start_roll, end_roll, roll_digits,
                    current=resolved_count, total=total, hall_ticket=ticket, cached_count=len(students),
                )

            for ticket in tickets:
                if not force_refresh and ticket in cached_map:
                    student = cached_map[ticket]
                    students.append(student)
                    resolved_count += 1
                    emit_progress(ticket, cached=True)
                    _class_job_push_event(key, {"type": "student", "student": student, "cached": True})
                    save_progress(ticket)
                    continue

                cached = _resolve_cached_class_student(ticket, force_refresh=force_refresh)
                if cached:
                    students.append(cached)
                    resolved_count += 1
                    emit_progress(ticket, cached=True)
                    _class_job_push_event(key, {"type": "student", "student": cached, "cached": True})
                    save_progress(ticket)
                    continue

                pending.append(ticket)

            def handle_portal_result(ticket: str, data: dict) -> None:
                nonlocal resolved_count
                resolved_count += 1
                emit_progress(ticket, cached=False)
                if "error" in data:
                    item = {"hallTicket": ticket, "error": data["error"]}
                    failed.append(item)
                    _class_job_push_event(key, {"type": "failed", "student": item})
                else:
                    row = to_class_student(data)
                    if is_enabled():
                        save_result(ticket, data)
                    students.append(row)
                    _class_job_push_event(key, {"type": "student", "student": row, "cached": False})
                save_progress(ticket)

            if pending:
                workers = _class_scrape_workers() if len(pending) > 1 else 1
                if workers <= 1:
                    from playwright.sync_api import sync_playwright

                    with sync_playwright() as p:
                        browser = p.chromium.launch(headless=True)
                        context = browser.new_context(user_agent=USER_AGENT)
                        page = context.new_page()
                        try:
                            _scrape_pending_sequential(page, pending, handle_portal_result, context)
                        finally:
                            browser.close()
                else:
                    _scrape_pending_parallel(pending, handle_portal_result, workers)

        result = finalize_class_result(students, failed, prefix, start_roll, end_roll, roll_digits)
        result["scrapeStatus"] = "complete"
        if is_enabled():
            save_class_result(key, result)
        result["_meta"] = {"source": "scraped_and_cached" if is_enabled() else "scraped", "cached": False}
        _class_job_push_event(key, {"type": "done", "result": result})

        with _class_scrape_jobs_lock:
            if key in _class_scrape_jobs:
                _class_scrape_jobs[key]["status"] = "completed"
                _class_scrape_jobs[key]["result"] = result
                _class_scrape_jobs[key]["updatedAt"] = _utc_now_iso()
        logger.info("Class scrape completed for %s (%s students)", key, len(students))
    except Exception as exc:
        logger.exception("Class scrape failed for %s: %s", key, exc)
        _class_job_push_event(key, {"type": "error", "message": str(exc)})
        try:
            result = finalize_class_result(students, failed, prefix, start_roll, end_roll, roll_digits)
            result["scrapeStatus"] = "failed"
            result["scrapeError"] = str(exc)
            if is_enabled():
                save_class_result(key, result)
        except Exception:
            logger.exception("Could not persist failed class scrape state for %s", key)
        with _class_scrape_jobs_lock:
            if key in _class_scrape_jobs:
                _class_scrape_jobs[key]["status"] = "failed"
                _class_scrape_jobs[key]["error"] = str(exc)
                _class_scrape_jobs[key]["updatedAt"] = _utc_now_iso()


def _class_scrape_process_entry(
    key: str,
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int,
    delay_sec: float,
    force_refresh: bool,
    lock_name: str,
) -> None:
    try:
        _execute_class_scrape(
            key, prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=force_refresh
        )
    finally:
        _release_refresh_lock(lock_name)


def start_class_scrape(
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int = 2,
    delay_sec: float = 0.5,
    *,
    force_refresh: bool = False,
) -> bool:
    """Start a class scrape in the background. Returns True when a new job starts."""
    prefix = prefix.strip().upper()
    key = class_cache_key(prefix, start_roll, end_roll, roll_digits)

    _cleanup_stale_class_job(key)

    with _class_scrape_jobs_lock:
        existing = _class_scrape_jobs.get(key)
        if existing and existing.get("status") == "running":
            return False

    lock_name = f"class-scrape:{key}"
    if not _acquire_class_scrape_lock(lock_name):
        logger.warning("Could not acquire class scrape lock for %s", key)
        return False

    with _class_scrape_jobs_lock:
        _class_scrape_jobs[key] = {
            "cacheKey": key,
            "prefix": prefix,
            "status": "running",
            "events": [],
            "result": None,
            "error": None,
            "startedAt": _utc_now_iso(),
            "updatedAt": _utc_now_iso(),
        }

    def run() -> None:
        process = _playwright_pool_ctx.Process(
            target=_class_scrape_process_entry,
            args=(key, prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh, lock_name),
            daemon=True,
            name=f"class-scrape-{key[:20]}",
        )
        process.start()

    run()
    return True


def iter_class_scrape_events(key: str, *, from_index: int = 0, poll_sec: float = 0.4):
    """Yield scrape SSE events until the job finishes. Polls Firebase when scrape runs in a child process."""
    index = from_index
    missing = 0
    seen_tickets: set[str] = set()
    seen_failed: set[str] = set()

    while True:
        emitted = False

        with _class_scrape_jobs_lock:
            job = _class_scrape_jobs.get(key)
            if job:
                events = job["events"][index:]
                status = job.get("status")
                index += len(events)
                for event in events:
                    emitted = True
                    yield event
                if status in ("completed", "failed"):
                    return

        if is_enabled():
            cached = get_cached_class(key)
            if cached:
                missing = 0
                data = dict(cached.get("data") or {})
                for student in data.get("students") or []:
                    ticket = (student.get("hallTicket") or "").upper()
                    if ticket and ticket not in seen_tickets:
                        seen_tickets.add(ticket)
                        emitted = True
                        yield {"type": "student", "student": student, "cached": True}
                for item in data.get("failed") or []:
                    ticket = (item.get("hallTicket") or "").upper()
                    if ticket and ticket not in seen_failed:
                        seen_failed.add(ticket)
                        emitted = True
                        yield {"type": "failed", "student": item}
                status = data.get("scrapeStatus")
                if status == "complete":
                    yield {"type": "done", "result": data}
                    return
                if status == "failed":
                    yield {"type": "error", "message": data.get("scrapeError") or "Class scrape failed"}
                    return
            else:
                missing += 1

        if not emitted:
            missing += 1
            if missing > 25:
                break
            time.sleep(poll_sec)
            continue

        missing = 0
        time.sleep(poll_sec)


def _meta(source: str, *, cached: bool, cached_at: str | None = None, updated: bool = False, response_ms: float | None = None, in_progress: bool = False) -> dict:
    meta: dict[str, Any] = {"source": source, "cached": cached}
    if cached_at:
        meta["cachedAt"] = cached_at
    if updated:
        meta["updated"] = True
    if response_ms is not None:
        meta["responseMs"] = response_ms
    if in_progress:
        meta["inProgress"] = True
    return meta


def _attach_meta(data: dict, meta: dict) -> dict:
    out = dict(data)
    out["_meta"] = meta
    return out


def _strip_meta(data: dict) -> tuple[dict, dict | None]:
    meta = data.get("_meta")
    clean = {k: v for k, v in data.items() if k != "_meta"}
    return clean, meta


def _with_refresh_lock(key: str) -> bool:
    with _refresh_guard:
        if key in _refresh_in_progress:
            return False
        _refresh_in_progress.add(key)
        return True


def _release_refresh_lock(key: str) -> None:
    with _refresh_guard:
        _refresh_in_progress.discard(key)


def _schedule_background(key: str, worker: Callable[[], None]) -> None:
    if not _with_refresh_lock(key):
        return

    def run() -> None:
        try:
            worker()
        finally:
            _release_refresh_lock(key)

    threading.Thread(target=run, daemon=True, name=f"refresh-{key[:24]}").start()


def _schedule_student_refresh(hall_ticket: str, cached_data: dict) -> None:
    ticket = hall_ticket.strip().upper()

    def worker() -> None:
        try:
            fresh = login_and_fetch_marks(ticket)
            if "error" in fresh:
                return
            if data_differ(cached_data, fresh):
                save_result(ticket, fresh)
                logger.info("Updated Firebase results for %s", ticket)
        except Exception as exc:
            logger.exception("Background student refresh failed for %s: %s", ticket, exc)

    _schedule_background(f"student:{ticket}", worker)


def _resolve_student_results(ticket: str, *, force_refresh: bool = False) -> dict:
    init_firebase()
    if is_enabled() and ticket:
        log_search(ticket)

    if force_refresh or not is_enabled():
        scraped = login_and_fetch_marks(ticket)
        if "error" in scraped:
            return scraped
        if is_enabled():
            save_result(ticket, scraped)
        source = "scraped" if not is_enabled() else "scraped_and_cached"
        return _attach_meta(scraped, _meta(source, cached=False))

    cached = get_cached_result(ticket)
    if not cached:
        scraped = login_and_fetch_marks(ticket)
        if "error" in scraped:
            return scraped
        save_result(ticket, scraped)
        return _attach_meta(scraped, _meta("scraped_and_cached", cached=False))

    data = dict(cached["data"])
    sync_refresh = os.environ.get("FIREBASE_SYNC_REFRESH", "false").lower() == "true"

    if sync_refresh:
        scraped = login_and_fetch_marks(ticket)
        if "error" in scraped:
            return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))
        if data_differ(data, scraped):
            save_result(ticket, scraped)
            return _attach_meta(scraped, _meta("scraped_and_updated", cached=False, updated=True))
        return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))

    _schedule_student_refresh(ticket, data)
    return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))


def get_student_results(hall_ticket: str, *, force_refresh: bool = False) -> dict:
    """Academic Results + Credits Analyzer — instant Firebase read on cache hit."""
    started = time.perf_counter()
    result = _resolve_student_results(hall_ticket.strip().upper(), force_refresh=force_refresh)
    if result.get("_meta", {}).get("cached"):
        result["_meta"]["responseMs"] = round((time.perf_counter() - started) * 1000, 1)
    return result


def get_backlog_report(hall_ticket: str, *, force_refresh: bool = False) -> dict:
    """Backlog Report — instant read from mrecw_backlog_reports when cached."""
    started = time.perf_counter()
    ticket = hall_ticket.strip().upper()
    init_firebase()

    if not force_refresh and is_enabled():
        cached_backlog = get_cached_backlog(ticket)
        if cached_backlog:
            data = dict(cached_backlog["data"])
            cached_result = get_cached_result(ticket)
            if cached_result:
                _schedule_student_refresh(ticket, cached_result["data"])
            elapsed = round((time.perf_counter() - started) * 1000, 1)
            return _attach_meta(
                data,
                _meta("firebase", cached=True, cached_at=cached_backlog.get("updatedAt"), response_ms=elapsed),
            )

    data = _resolve_student_results(ticket, force_refresh=force_refresh)
    if "error" in data:
        return data
    meta = data.pop("_meta", None)
    report = build_backlog_report(data)
    if meta:
        report["_meta"] = meta
    return report


def _contrast_from_cached_students(a: str, b: str) -> dict | None:
    cached_a = get_cached_result(a)
    cached_b = get_cached_result(b)
    if not cached_a or not cached_b:
        return None
    contrast = build_result_contrast(cached_a["data"], cached_b["data"])
    _schedule_student_refresh(a, cached_a["data"])
    _schedule_student_refresh(b, cached_b["data"])
    return contrast


def get_result_contrast(ticket_a: str, ticket_b: str, *, force_refresh: bool = False) -> dict:
    """Result Compare — instant read from contrast cache or two cached student records."""
    started = time.perf_counter()
    a = ticket_a.strip().upper()
    b = ticket_b.strip().upper()
    key = contrast_cache_key(a, b)
    init_firebase()

    if not force_refresh and is_enabled():
        cached = get_cached_contrast(key)
        if cached:
            data = dict(cached["data"])
            has_full = (
                isinstance(data.get("first"), dict)
                and isinstance(data.get("second"), dict)
                and data["first"].get("subjects")
                and data["second"].get("subjects")
            )
            if not has_full:
                rebuilt = _contrast_from_cached_students(a, b)
                if rebuilt:
                    save_contrast(key, rebuilt)
                    elapsed = round((time.perf_counter() - started) * 1000, 1)
                    rebuilt["_meta"] = {
                        "source": "firebase",
                        "cached": True,
                        "responseMs": elapsed,
                    }
                    return rebuilt
            for ticket in (a, b):
                row = get_cached_result(ticket)
                if row:
                    _schedule_student_refresh(ticket, row["data"])
            elapsed = round((time.perf_counter() - started) * 1000, 1)
            return _attach_meta(
                data,
                _meta("firebase", cached=True, cached_at=cached.get("updatedAt"), response_ms=elapsed),
            )

        built = _contrast_from_cached_students(a, b)
        if built:
            save_contrast(key, built)
            elapsed = round((time.perf_counter() - started) * 1000, 1)
            built["_meta"] = {
                "source": "firebase",
                "cached": True,
                "responseMs": elapsed,
            }
            return built

    data_a = _resolve_student_results(a, force_refresh=force_refresh)
    if "error" in data_a:
        return data_a

    data_b = _resolve_student_results(b, force_refresh=force_refresh)
    if "error" in data_b:
        return data_b

    clean_a, meta_a = _strip_meta(data_a)
    clean_b, meta_b = _strip_meta(data_b)
    contrast = build_result_contrast(clean_a, clean_b)
    contrast["_meta"] = {
        "source": "firebase" if (meta_a or {}).get("cached") and (meta_b or {}).get("cached") else "mixed",
        "cached": bool((meta_a or {}).get("cached") and (meta_b or {}).get("cached")),
        "cachedAtA": (meta_a or {}).get("cachedAt"),
        "cachedAtB": (meta_b or {}).get("cachedAt"),
    }

    if is_enabled():
        save_contrast(key, {k: v for k, v in contrast.items() if k != "_meta"})

    return contrast


def _credits_contrast_from_cached_students(a: str, b: str) -> dict | None:
    cached_a = get_cached_result(a)
    cached_b = get_cached_result(b)
    if not cached_a or not cached_b:
        return None
    contrast = build_credits_contrast(cached_a["data"], cached_b["data"])
    _schedule_student_refresh(a, cached_a["data"])
    _schedule_student_refresh(b, cached_b["data"])
    return contrast


def get_credits_compare(ticket_a: str, ticket_b: str, *, force_refresh: bool = False) -> dict:
    """Credits Compare — side-by-side credit analysis for two students."""
    started = time.perf_counter()
    a = ticket_a.strip().upper()
    b = ticket_b.strip().upper()
    key = contrast_cache_key(a, b)
    init_firebase()

    if not force_refresh and is_enabled():
        cached = get_cached_credits_contrast(key)
        if cached:
            data = dict(cached["data"])
            for ticket in (a, b):
                row = get_cached_result(ticket)
                if row:
                    _schedule_student_refresh(ticket, row["data"])
            elapsed = round((time.perf_counter() - started) * 1000, 1)
            return _attach_meta(
                data,
                _meta("firebase", cached=True, cached_at=cached.get("updatedAt"), response_ms=elapsed),
            )

        built = _credits_contrast_from_cached_students(a, b)
        if built:
            save_credits_contrast(key, built)
            elapsed = round((time.perf_counter() - started) * 1000, 1)
            built["_meta"] = {
                "source": "firebase",
                "cached": True,
                "responseMs": elapsed,
            }
            return built

    data_a = _resolve_student_results(a, force_refresh=force_refresh)
    if "error" in data_a:
        return data_a

    data_b = _resolve_student_results(b, force_refresh=force_refresh)
    if "error" in data_b:
        return data_b

    clean_a, meta_a = _strip_meta(data_a)
    clean_b, meta_b = _strip_meta(data_b)
    contrast = build_credits_contrast(clean_a, clean_b)
    contrast["_meta"] = {
        "source": "firebase" if (meta_a or {}).get("cached") and (meta_b or {}).get("cached") else "mixed",
        "cached": bool((meta_a or {}).get("cached") and (meta_b or {}).get("cached")),
        "cachedAtA": (meta_a or {}).get("cachedAt"),
        "cachedAtB": (meta_b or {}).get("cachedAt"),
    }

    if is_enabled():
        save_credits_contrast(key, {k: v for k, v in contrast.items() if k != "_meta"})

    return contrast


def finalize_class_result(students: list, failed: list, prefix: str, start_roll: int, end_roll: int, roll_digits: int) -> dict:
    students = sorted(students, key=lambda row: float(row.get("cgpa") or 0), reverse=True)
    cgpa_values = [float(s["cgpa"]) for s in students if s.get("cgpa")]
    class_avg = round(sum(cgpa_values) / len(cgpa_values), 2) if cgpa_values else None
    total = end_roll - start_roll + 1
    return {
        "prefix": prefix,
        "startRoll": start_roll,
        "endRoll": end_roll,
        "rollDigits": roll_digits,
        "totalAttempted": total,
        "successCount": len(students),
        "failedCount": len(failed),
        "classAverageCgpa": class_avg,
        "students": students,
        "failed": failed,
    }


def schedule_class_refresh(prefix: str, start_roll: int, end_roll: int, roll_digits: int, delay_sec: float) -> None:
    key = class_cache_key(prefix, start_roll, end_roll, roll_digits)

    def worker() -> None:
        try:
            fresh = fetch_class_results(prefix, start_roll, end_roll, roll_digits, delay_sec, summary_only=True)
            for student in fresh.get("students") or []:
                ticket = (student.get("hallTicket") or "").upper()
                if ticket:
                    save_result(ticket, student)
            save_class_result(key, fresh)
            logger.info("Background class refresh saved for %s", key)
        except Exception as exc:
            logger.exception("Background class refresh failed for %s: %s", key, exc)

    _schedule_background(f"class:{key}", worker)


def get_class_results(
    prefix: str,
    start_roll: int,
    end_roll: int,
    roll_digits: int = 2,
    delay_sec: float = 0.5,
    *,
    force_refresh: bool = False,
) -> dict:
    """Class Results — always scoped to the requested roll range."""
    started = time.perf_counter()
    prefix = prefix.strip().upper()
    key = class_cache_key(prefix, start_roll, end_roll, roll_digits)
    init_firebase()
    total = end_roll - start_roll + 1

    def finish(data: dict, *, cached: bool, in_progress: bool = False, cached_at: str | None = None) -> dict:
        scoped = filter_class_result_to_range(data, prefix, start_roll, end_roll, roll_digits)
        elapsed = round((time.perf_counter() - started) * 1000, 1)
        return _attach_meta(
            scoped,
            _meta(
                "firebase" if cached else "scraped",
                cached=cached,
                cached_at=cached_at,
                response_ms=elapsed,
                in_progress=in_progress or scoped.get("scrapeStatus") == "in_progress",
            ),
        )

    def start_missing_scrape(result: dict) -> dict:
        _ensure_class_scrape_running(
            key, prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=force_refresh
        )
        result = dict(result)
        result["scrapeStatus"] = "in_progress"
        result["scrapeProgress"] = _class_progress_from_result(result)
        if is_enabled():
            save_class_result(key, result)
        return finish(result, cached=True, in_progress=True)

    if not force_refresh and is_enabled():
        cached = get_cached_class(key)
        if cached:
            data = filter_class_result_to_range(dict(cached["data"]), prefix, start_roll, end_roll, roll_digits)
            in_progress = data.get("scrapeStatus") == "in_progress"
            if in_progress:
                _ensure_class_scrape_running(
                    key, prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=force_refresh
                )
            elif _class_range_needs_scrape(data):
                return start_missing_scrape(data)
            else:
                schedule_class_refresh(prefix, start_roll, end_roll, roll_digits, delay_sec)
            return finish(data, cached=True, in_progress=in_progress, cached_at=cached.get("updatedAt"))

        assembled = build_class_from_cache(prefix, start_roll, end_roll, roll_digits)
        if assembled:
            save_class_result(key, assembled)
            schedule_class_refresh(prefix, start_roll, end_roll, roll_digits, delay_sec)
            return finish(assembled, cached=True)

        partial = assemble_class_from_individual_cache(prefix, start_roll, end_roll, roll_digits)
        if partial["resolvedCount"] > 0:
            result = finalize_class_result(
                partial["students"], partial["failed"], prefix, start_roll, end_roll, roll_digits
            )
            if partial["missingCount"] > 0:
                return start_missing_scrape(result)
            result["scrapeStatus"] = "complete"
            save_class_result(key, result)
            schedule_class_refresh(prefix, start_roll, end_roll, roll_digits, delay_sec)
            return finish(result, cached=True)

    if is_class_scrape_running(key):
        cached = get_cached_class(key) if is_enabled() else None
        if cached:
            data = filter_class_result_to_range(dict(cached["data"]), prefix, start_roll, end_roll, roll_digits)
            return finish(data, cached=True, in_progress=True, cached_at=cached.get("updatedAt"))

    _ensure_class_scrape_running(
        key, prefix, start_roll, end_roll, roll_digits, delay_sec, force_refresh=force_refresh
    )
    if is_enabled():
        cached = get_cached_class(key)
        if cached:
            data = filter_class_result_to_range(dict(cached["data"]), prefix, start_roll, end_roll, roll_digits)
            return finish(data, cached=True, in_progress=True, cached_at=cached.get("updatedAt"))

    placeholder = finalize_class_result([], [], prefix, start_roll, end_roll, roll_digits)
    placeholder["scrapeStatus"] = "in_progress"
    placeholder["scrapeProgress"] = {"current": 0, "total": total, "remaining": total, "cachedCount": 0, "hallTicket": None}
    return finish(placeholder, cached=False, in_progress=True)


def resolve_class_student(ticket: str, *, force_refresh: bool = False) -> dict:
    """Resolve one class row from Firebase or scrape."""
    ticket = ticket.strip().upper()
    init_firebase()

    if not force_refresh and is_enabled():
        cached = get_cached_result(ticket)
        if cached:
            _schedule_student_refresh(ticket, cached["data"])
            return to_class_student(cached["data"])

    scraped = login_and_fetch_marks(ticket)
    if "error" in scraped:
        return scraped

    row = to_class_student(scraped)
    if is_enabled():
        save_result(ticket, scraped)
    return row


def build_class_from_cache(prefix: str, start_roll: int, end_roll: int, roll_digits: int) -> dict | None:
    """Build class result entirely from cached student documents when all exist."""
    partial = assemble_class_from_individual_cache(prefix, start_roll, end_roll, roll_digits)
    if not partial["complete"]:
        return None
    return finalize_class_result(partial["students"], partial["failed"], prefix, start_roll, end_roll, roll_digits)


def _schedule_attendance_refresh(hall_ticket: str, cached_data: dict) -> None:
    ticket = hall_ticket.strip().upper()

    def worker() -> None:
        try:
            fresh = fetch_student_attendance(ticket)
            if "error" in fresh:
                return
            if data_differ(cached_data, fresh):
                save_attendance(ticket, fresh)
                logger.info("Updated Firebase attendance for %s", ticket)
        except Exception as exc:
            logger.exception("Background attendance refresh failed for %s: %s", ticket, exc)

    _schedule_background(f"attendance:{ticket}", worker)


def _resolve_student_attendance(ticket: str, *, force_refresh: bool = False) -> dict:
    init_firebase()
    if is_enabled() and ticket:
        log_search(ticket)

    if force_refresh or not is_enabled():
        scraped = fetch_student_attendance(ticket)
        if "error" in scraped:
            return scraped
        if is_enabled():
            save_attendance(ticket, scraped)
        source = "scraped" if not is_enabled() else "scraped_and_cached"
        return _attach_meta(scraped, _meta(source, cached=False))

    cached = get_cached_attendance(ticket)
    if not cached:
        scraped = fetch_student_attendance(ticket)
        if "error" in scraped:
            return scraped
        save_attendance(ticket, scraped)
        return _attach_meta(scraped, _meta("scraped_and_cached", cached=False))

    data = dict(cached["data"])
    sync_refresh = os.environ.get("FIREBASE_SYNC_REFRESH", "false").lower() == "true"

    if sync_refresh:
        scraped = fetch_student_attendance(ticket)
        if "error" in scraped:
            return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))
        if data_differ(data, scraped):
            save_attendance(ticket, scraped)
            return _attach_meta(scraped, _meta("scraped_and_updated", cached=False, updated=True))
        return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))

    _schedule_attendance_refresh(ticket, data)
    return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))


def get_student_attendance(hall_ticket: str, *, force_refresh: bool = False) -> dict:
    """Overall attendance — instant Firebase read on cache hit."""
    started = time.perf_counter()
    result = _resolve_student_attendance(hall_ticket.strip().upper(), force_refresh=force_refresh)
    if result.get("_meta", {}).get("cached"):
        result["_meta"]["responseMs"] = round((time.perf_counter() - started) * 1000, 1)
    return result


def _schedule_overall_result_refresh(hall_ticket: str, cached_data: dict) -> None:
    ticket = hall_ticket.strip().upper()

    def worker() -> None:
        try:
            fresh = fetch_student_overall_result(ticket)
            if "error" in fresh:
                return
            if data_differ(cached_data, fresh):
                save_overall_result(ticket, fresh)
                logger.info("Updated Firebase overall result for %s", ticket)
        except Exception as exc:
            logger.exception("Background overall result refresh failed for %s: %s", ticket, exc)

    _schedule_background(f"overall-result:{ticket}", worker)


def _resolve_student_overall_result(ticket: str, *, force_refresh: bool = False) -> dict:
    init_firebase()
    if is_enabled() and ticket:
        log_search(ticket)

    if force_refresh or not is_enabled():
        scraped = fetch_student_overall_result(ticket)
        if "error" in scraped:
            return scraped
        if is_enabled():
            save_overall_result(ticket, scraped)
        source = "scraped" if not is_enabled() else "scraped_and_cached"
        return _attach_meta(scraped, _meta(source, cached=False))

    cached = get_cached_overall_result(ticket)
    if not cached:
        scraped = fetch_student_overall_result(ticket)
        if "error" in scraped:
            return scraped
        save_overall_result(ticket, scraped)
        return _attach_meta(scraped, _meta("scraped_and_cached", cached=False))

    data = dict(cached["data"])
    sync_refresh = os.environ.get("FIREBASE_SYNC_REFRESH", "false").lower() == "true"

    if sync_refresh:
        scraped = fetch_student_overall_result(ticket)
        if "error" in scraped:
            return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))
        if data_differ(data, scraped):
            save_overall_result(ticket, scraped)
            return _attach_meta(scraped, _meta("scraped_and_updated", cached=False, updated=True))
        return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))

    _schedule_overall_result_refresh(ticket, data)
    return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))


def get_student_overall_result(hall_ticket: str, *, force_refresh: bool = False) -> dict:
    """Semester-wise SGPA/CGPA overall result — instant Firebase read on cache hit."""
    started = time.perf_counter()
    result = _resolve_student_overall_result(hall_ticket.strip().upper(), force_refresh=force_refresh)
    if result.get("_meta", {}).get("cached"):
        result["_meta"]["responseMs"] = round((time.perf_counter() - started) * 1000, 1)
    return result


def _schedule_semwise_marks_refresh(hall_ticket: str, cached_data: dict) -> None:
    ticket = hall_ticket.strip().upper()

    def worker() -> None:
        try:
            fresh = fetch_student_semwise_marks(ticket)
            if "error" in fresh:
                return
            if data_differ(cached_data, fresh):
                save_semwise_marks(ticket, fresh)
                logger.info("Updated Firebase semwise marks for %s", ticket)
        except Exception as exc:
            logger.exception("Background semwise marks refresh failed for %s: %s", ticket, exc)

    _schedule_background(f"semwise-marks:{ticket}", worker)


def _resolve_student_semwise_marks(ticket: str, *, force_refresh: bool = False) -> dict:
    init_firebase()
    if is_enabled() and ticket:
        log_search(ticket)

    if force_refresh or not is_enabled():
        scraped = fetch_student_semwise_marks(ticket)
        if "error" in scraped:
            return scraped
        if is_enabled():
            save_semwise_marks(ticket, scraped)
        source = "scraped" if not is_enabled() else "scraped_and_cached"
        return _attach_meta(scraped, _meta(source, cached=False))

    cached = get_cached_semwise_marks(ticket)
    if not cached:
        scraped = fetch_student_semwise_marks(ticket)
        if "error" in scraped:
            return scraped
        save_semwise_marks(ticket, scraped)
        return _attach_meta(scraped, _meta("scraped_and_cached", cached=False))

    data = dict(cached["data"])
    sync_refresh = os.environ.get("FIREBASE_SYNC_REFRESH", "false").lower() == "true"

    if sync_refresh:
        scraped = fetch_student_semwise_marks(ticket)
        if "error" in scraped:
            return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))
        if data_differ(data, scraped):
            save_semwise_marks(ticket, scraped)
            return _attach_meta(scraped, _meta("scraped_and_updated", cached=False, updated=True))
        return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))

    _schedule_semwise_marks_refresh(ticket, data)
    return _attach_meta(data, _meta("firebase", cached=True, cached_at=cached.get("updatedAt")))


def get_student_semwise_marks(hall_ticket: str, *, force_refresh: bool = False) -> dict:
    """Semester-wise marks — instant Firebase read on cache hit."""
    started = time.perf_counter()
    result = _resolve_student_semwise_marks(hall_ticket.strip().upper(), force_refresh=force_refresh)
    if result.get("_meta", {}).get("cached"):
        result["_meta"]["responseMs"] = round((time.perf_counter() - started) * 1000, 1)
    return result


def get_exam_hall_tickets(hall_ticket: str, *, force_refresh: bool = False) -> dict:
    started = time.perf_counter()
    ticket = hall_ticket.strip().upper()
    init_firebase()
    log_search(ticket)

    if not force_refresh and is_enabled():
        cached = get_cached_exam_hall_tickets(ticket)
        if cached:
            elapsed = round((time.perf_counter() - started) * 1000, 1)
            return _attach_meta(
                cached["data"],
                _meta("firebase", cached=True, cached_at=cached.get("updatedAt"), response_ms=elapsed),
            )

    scraped = fetch_exam_hall_tickets(ticket)
    elapsed = round((time.perf_counter() - started) * 1000, 1)

    if "error" in scraped:
        return _attach_meta(scraped, _meta("scraped", cached=False, response_ms=elapsed))

    if is_enabled():
        save_exam_hall_tickets(ticket, scraped)

    source = "scraped_and_cached" if is_enabled() else "scraped"
    return _attach_meta(scraped, _meta(source, cached=False, response_ms=elapsed))

