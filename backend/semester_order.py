"""Chronological ordering for MRECW semester labels like III/IV I SEM."""

from __future__ import annotations

import re
from typing import Any, Callable, TypeVar

ROMAN_VALUES = {
    "I": 1,
    "II": 2,
    "III": 3,
    "IV": 4,
    "V": 5,
    "VI": 6,
    "VII": 7,
    "VIII": 8,
    "IX": 9,
    "X": 10,
}

_SEMESTER_RE = re.compile(r"^([IVXLCDM]+)/[IVXLCDM]+\s+([IVXLCDM]+)\s+SEM$", re.IGNORECASE)

T = TypeVar("T")


def semester_sort_key(label: str) -> int:
    match = _SEMESTER_RE.match((label or "").strip())
    if not match:
        return 0
    year = ROMAN_VALUES.get(match.group(1).upper(), 0)
    sem_in_year = ROMAN_VALUES.get(match.group(2).upper(), 0)
    return (year - 1) * 2 + sem_in_year


def sort_semesters_desc(items: list[T], label_fn: Callable[[T], str]) -> list[T]:
    return sorted(items, key=lambda item: semester_sort_key(label_fn(item)), reverse=True)


def sort_semesters_asc(items: list[T], label_fn: Callable[[T], str]) -> list[T]:
    return sorted(items, key=lambda item: semester_sort_key(label_fn(item)))


_YEAR_ROMAN = ("I", "II", "III", "IV")


def next_semester(label: str) -> str | None:
    key = semester_sort_key(label)
    if key <= 0:
        return None
    next_key = key + 1
    if next_key > 8:
        return None
    year = (next_key - 1) // 2 + 1
    sem_in_year = (next_key - 1) % 2 + 1
    return f"{_YEAR_ROMAN[year - 1]}/IV {'I' if sem_in_year == 1 else 'II'} SEM"


def infer_pending_semester(published: list[str], header_semester: str | None) -> str | None:
    if not published or not header_semester:
        return None
    if header_semester in published:
        return None

    latest = max(published, key=semester_sort_key)
    next_after_latest = next_semester(latest)
    if not next_after_latest:
        return header_semester

    if semester_sort_key(header_semester) > semester_sort_key(next_after_latest):
        return next_after_latest
    return next_after_latest


ACADEMIC_MONTH_ORDER = {
    "JUNE": 0,
    "JULY": 1,
    "AUGUST": 2,
    "SEPTEMBER": 3,
    "OCTOBER": 4,
    "NOVEMBER": 5,
    "DECEMBER": 6,
    "JANUARY": 7,
    "FEBRUARY": 8,
    "MARCH": 9,
    "APRIL": 10,
    "MAY": 11,
}


def month_sort_key(month: str) -> int:
    return ACADEMIC_MONTH_ORDER.get((month or "").strip().upper(), 99)


def sort_attendance_months(group: dict[str, Any]) -> dict[str, Any]:
    months = group.get("months") or []
    if months:
        group = {**group, "months": sorted(months, key=lambda row: month_sort_key(row.get("month", "")))}
    return group
