"""Firebase Firestore cache for MRECW results."""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

COLLECTION_RESULTS = "mrecw_results"
COLLECTION_CLASS = "mrecw_class_results"
COLLECTION_BACKLOG = "mrecw_backlog_reports"
COLLECTION_CONTRAST = "mrecw_result_contrast"
COLLECTION_CREDITS_CONTRAST = "mrecw_credits_contrast"
COLLECTION_EXAM_HALL_TICKETS = "mrecw_exam_hall_tickets"
COLLECTION_ATTENDANCE = "mrecw_attendance"
COLLECTION_OVERALL_RESULTS = "mrecw_overall_results"
COLLECTION_SEMWISE_MARKS = "mrecw_semwise_marks"
COLLECTION_ANALYTICS = "mrecw_analytics"
COLLECTION_SEARCH_INDEX = "mrecw_search_index"
COLLECTION_FEEDBACK = "mrecw_feedback"
COLLECTION_ADMIN_USERS = "mrecw_admin_users"
COLLECTION_SETTINGS = "mrecw_settings"
ANALYTICS_DOC = "global"
SETTINGS_FOOTER_DOC = "footer"

_db = None
_initialized = False
_enabled = False


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def content_hash(data: dict) -> str:
    payload = {k: v for k, v in data.items() if not str(k).startswith("_")}
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def is_enabled() -> bool:
    return _enabled


def _resolve_credentials_path() -> str:
    explicit = os.environ.get("FIREBASE_CREDENTIALS_PATH", "").strip()
    if explicit and os.path.isfile(explicit):
        return explicit

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(backend_dir)

    for base in (backend_dir, root_dir):
        if not os.path.isdir(base):
            continue
        for name in os.listdir(base):
            if name.endswith(".json") and "firebase-adminsdk" in name:
                return os.path.join(base, name)

    return ""


def init_firebase() -> bool:
    global _db, _initialized, _enabled

    if _initialized:
        return _enabled

    _initialized = True

    cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON", "").strip()
    cred_path = _resolve_credentials_path()

    if not cred_json and not cred_path:
        logger.info("Firebase cache disabled: no credentials configured")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if firebase_admin._apps:
            _db = firestore.client()
            _enabled = True
            return True

        if cred_json:
            cred = credentials.Certificate(json.loads(cred_json))
        else:
            cred = credentials.Certificate(cred_path)

        firebase_admin.initialize_app(cred)
        _db = firestore.client()
        _enabled = True
        logger.info("Firebase cache enabled")
        return True
    except Exception as exc:
        logger.exception("Firebase init failed: %s", exc)
        return False


def get_document(collection: str, doc_id: str) -> dict[str, Any] | None:
    if not _enabled or _db is None:
        return None

    doc_id = doc_id.strip().upper() if collection == COLLECTION_RESULTS else doc_id.strip()
    try:
        doc = _db.collection(collection).document(doc_id).get()
        if not doc.exists:
            return None
        payload = doc.to_dict() or {}
        data = payload.get("data")
        if not isinstance(data, dict):
            return None
        return {
            "id": doc_id,
            "data": data,
            "contentHash": payload.get("contentHash"),
            "createdAt": payload.get("createdAt"),
            "updatedAt": payload.get("updatedAt"),
        }
    except Exception as exc:
        logger.exception("Firebase read failed [%s/%s]: %s", collection, doc_id, exc)
        return None


def save_document(collection: str, doc_id: str, data: dict, *, key_field: str | None = None) -> bool:
    if not _enabled or _db is None:
        return False

    doc_id = doc_id.strip().upper() if collection == COLLECTION_RESULTS else doc_id.strip()
    clean = {k: v for k, v in data.items() if not str(k).startswith("_") and k != "error"}
    now = _utc_now_iso()
    doc_ref = _db.collection(collection).document(doc_id)

    try:
        existing = doc_ref.get()
        created_at = now
        if existing.exists:
            created_at = (existing.to_dict() or {}).get("createdAt") or now

        payload: dict[str, Any] = {
            "data": clean,
            "contentHash": content_hash(clean),
            "createdAt": created_at,
            "updatedAt": now,
        }
        if key_field:
            payload[key_field] = doc_id

        doc_ref.set(payload)
        return True
    except Exception as exc:
        logger.exception("Firebase write failed [%s/%s]: %s", collection, doc_id, exc)
        return False


def data_differ(cached_data: dict, fresh_data: dict) -> bool:
    return content_hash(cached_data) != content_hash(fresh_data)


def get_cached_result(hall_ticket: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_RESULTS, hall_ticket)


def save_result(hall_ticket: str, data: dict) -> bool:
    ticket = hall_ticket.strip().upper()
    saved = save_document(COLLECTION_RESULTS, ticket, data, key_field="hallTicket")
    if saved and data.get("subjects"):
        backlog = _build_backlog_payload(data)
        save_document(COLLECTION_BACKLOG, ticket, backlog, key_field="hallTicket")
    return saved


def get_cached_backlog(hall_ticket: str) -> dict[str, Any] | None:
    cached = get_document(COLLECTION_BACKLOG, hall_ticket)
    if cached:
        return cached
    result = get_cached_result(hall_ticket)
    if not result:
        return None
    from scraper import build_backlog_report

    return {
        "id": hall_ticket.strip().upper(),
        "data": build_backlog_report(result["data"]),
        "contentHash": None,
        "createdAt": result.get("createdAt"),
        "updatedAt": result.get("updatedAt"),
    }


def get_cached_class(class_key: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_CLASS, class_key)


def save_class_result(class_key: str, data: dict) -> bool:
    return save_document(COLLECTION_CLASS, class_key, data, key_field="classKey")


def get_cached_contrast(key: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_CONTRAST, key)


def save_contrast(key: str, data: dict) -> bool:
    return save_document(COLLECTION_CONTRAST, key, data, key_field="contrastKey")


def get_cached_credits_contrast(key: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_CREDITS_CONTRAST, key)


def save_credits_contrast(key: str, data: dict) -> bool:
    return save_document(COLLECTION_CREDITS_CONTRAST, key, data, key_field="contrastKey")


def get_cached_exam_hall_tickets(hall_ticket: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_EXAM_HALL_TICKETS, hall_ticket)


def save_exam_hall_tickets(hall_ticket: str, data: dict) -> bool:
    return save_document(COLLECTION_EXAM_HALL_TICKETS, hall_ticket.strip().upper(), data, key_field="hallTicket")


def get_cached_attendance(hall_ticket: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_ATTENDANCE, hall_ticket)


def save_attendance(hall_ticket: str, data: dict) -> bool:
    return save_document(COLLECTION_ATTENDANCE, hall_ticket.strip().upper(), data, key_field="hallTicket")


def get_cached_overall_result(hall_ticket: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_OVERALL_RESULTS, hall_ticket)


def save_overall_result(hall_ticket: str, data: dict) -> bool:
    return save_document(COLLECTION_OVERALL_RESULTS, hall_ticket.strip().upper(), data, key_field="hallTicket")


def get_cached_semwise_marks(hall_ticket: str) -> dict[str, Any] | None:
    return get_document(COLLECTION_SEMWISE_MARKS, hall_ticket)


def save_semwise_marks(hall_ticket: str, data: dict) -> bool:
    return save_document(COLLECTION_SEMWISE_MARKS, hall_ticket.strip().upper(), data, key_field="hallTicket")


def class_cache_key(prefix: str, start_roll: int, end_roll: int, roll_digits: int) -> str:
    return f"{prefix.strip().upper()}_{start_roll}_{end_roll}_{roll_digits}"


def contrast_cache_key(ticket_a: str, ticket_b: str) -> str:
    a, b = sorted([ticket_a.strip().upper(), ticket_b.strip().upper()])
    return f"{a}__{b}"


def _build_backlog_payload(data: dict) -> dict:
    from scraper import build_backlog_report

    return build_backlog_report(data)


def to_summary(student: dict) -> dict:
    return {
        "hallTicket": student.get("hallTicket"),
        "studentName": student.get("studentName"),
        "branch": student.get("branch"),
        "cgpa": student.get("cgpa"),
        "percentage": student.get("percentage"),
        "creditsObtained": student.get("creditsObtained"),
        "creditsTotal": student.get("creditsTotal"),
        "subjectsDue": student.get("subjectsDue"),
        "subjectsTotal": student.get("subjectsTotal"),
    }


def log_search(hall_ticket: str) -> None:
    if not _enabled or _db is None:
        return

    ticket = hall_ticket.strip().upper()
    if not ticket:
        return

    now = _utc_now_iso()
    try:
        analytics_ref = _db.collection(COLLECTION_ANALYTICS).document(ANALYTICS_DOC)
        analytics = analytics_ref.get()
        if analytics.exists:
            current = analytics.to_dict() or {}
            total = int(current.get("totalSearches") or 0) + 1
        else:
            total = 1
        analytics_ref.set({"totalSearches": total, "updatedAt": now}, merge=True)

        index_ref = _db.collection(COLLECTION_SEARCH_INDEX).document(ticket)
        index_doc = index_ref.get()
        if index_doc.exists:
            count = int((index_doc.to_dict() or {}).get("count") or 0) + 1
        else:
            count = 1
        index_ref.set({"hallTicket": ticket, "count": count, "lastSearchedAt": now}, merge=True)
    except Exception as exc:
        logger.exception("Failed to log search for %s: %s", ticket, exc)


def count_collection(collection: str) -> int:
    if not _enabled or _db is None:
        return 0
    try:
        # Prefer aggregation count when available
        agg = _db.collection(collection).count().get()
        if agg and len(agg) > 0:
            return int(agg[0][0].value)
    except Exception:
        pass
    try:
        return sum(1 for _ in _db.collection(collection).stream())
    except Exception as exc:
        logger.exception("Count failed for %s: %s", collection, exc)
        return 0


def list_all_stored_tickets() -> list[str]:
    if not _enabled or _db is None:
        return []
    try:
        return sorted(doc.id for doc in _db.collection(COLLECTION_RESULTS).stream())
    except Exception as exc:
        logger.exception("Failed to list stored tickets: %s", exc)
        return []


def list_all_class_sections() -> list[dict[str, Any]]:
    if not _enabled or _db is None:
        return []

    sections: list[dict[str, Any]] = []
    try:
        for doc in _db.collection(COLLECTION_CLASS).stream():
            raw = doc.to_dict() or {}
            payload = raw.get("data") if isinstance(raw.get("data"), dict) else raw
            if not isinstance(payload, dict):
                continue
            if payload.get("scrapeStatus") == "in_progress":
                continue
            prefix = payload.get("prefix")
            if not prefix:
                continue
            sections.append({
                "key": doc.id,
                "prefix": str(prefix).upper(),
                "startRoll": int(payload.get("startRoll") or 1),
                "endRoll": int(payload.get("endRoll") or 60),
                "rollDigits": int(payload.get("rollDigits") or 2),
            })
    except Exception as exc:
        logger.exception("Failed to list class sections: %s", exc)
    return sections


def get_admin_stats() -> dict:
    if not _enabled or _db is None:
        return {
            "firebaseEnabled": False,
            "storedStudents": 0,
            "totalSearches": 0,
            "uniqueStudentsSearched": 0,
            "storedBacklogs": 0,
            "storedClassResults": 0,
            "storedResultCompares": 0,
            "storedCreditsCompares": 0,
            "storedExamHallTickets": 0,
            "storedAttendance": 0,
            "storedOverallResults": 0,
            "storedSemwiseMarks": 0,
        }

    analytics = {}
    try:
        doc = _db.collection(COLLECTION_ANALYTICS).document(ANALYTICS_DOC).get()
        if doc.exists:
            analytics = doc.to_dict() or {}
    except Exception:
        pass

    return {
        "firebaseEnabled": True,
        "storedStudents": count_collection(COLLECTION_RESULTS),
        "totalSearches": int(analytics.get("totalSearches") or 0),
        "uniqueStudentsSearched": count_collection(COLLECTION_SEARCH_INDEX),
        "storedBacklogs": count_collection(COLLECTION_BACKLOG),
        "storedClassResults": count_collection(COLLECTION_CLASS),
        "storedResultCompares": count_collection(COLLECTION_CONTRAST),
        "storedCreditsCompares": count_collection(COLLECTION_CREDITS_CONTRAST),
        "storedExamHallTickets": count_collection(COLLECTION_EXAM_HALL_TICKETS),
        "storedAttendance": count_collection(COLLECTION_ATTENDANCE),
        "storedOverallResults": count_collection(COLLECTION_OVERALL_RESULTS),
        "storedSemwiseMarks": count_collection(COLLECTION_SEMWISE_MARKS),
        "lastAnalyticsUpdate": analytics.get("updatedAt"),
    }


def get_raw_document(collection: str, doc_id: str) -> dict[str, Any] | None:
    if not _enabled or _db is None:
        return None
    try:
        doc = _db.collection(collection).document(doc_id).get()
        if not doc.exists:
            return None
        payload = doc.to_dict() or {}
        payload["id"] = doc_id
        return payload
    except Exception as exc:
        logger.exception("Raw read failed [%s/%s]: %s", collection, doc_id, exc)
        return None


def set_raw_document(collection: str, doc_id: str, data: dict, *, merge: bool = False) -> bool:
    if not _enabled or _db is None:
        return False
    try:
        _db.collection(collection).document(doc_id).set(data, merge=merge)
        return True
    except Exception as exc:
        logger.exception("Raw write failed [%s/%s]: %s", collection, doc_id, exc)
        return False


def delete_raw_document(collection: str, doc_id: str) -> bool:
    if not _enabled or _db is None:
        return False
    try:
        _db.collection(collection).document(doc_id).delete()
        return True
    except Exception as exc:
        logger.exception("Raw delete failed [%s/%s]: %s", collection, doc_id, exc)
        return False


def list_raw_documents(
    collection: str,
    *,
    order_field: str = "createdAt",
    descending: bool = True,
    limit: int = 200,
) -> list[dict[str, Any]]:
    if not _enabled or _db is None:
        return []
    try:
        query = _db.collection(collection).order_by(
            order_field, direction="DESCENDING" if descending else "ASCENDING"
        ).limit(limit)
        return [{"id": doc.id, **(doc.to_dict() or {})} for doc in query.stream()]
    except Exception as exc:
        logger.exception("Raw list failed [%s]: %s", collection, exc)
        try:
            return [{"id": doc.id, **(doc.to_dict() or {})} for doc in _db.collection(collection).stream()]
        except Exception:
            return []
