from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, List, Optional, Sequence


def safe_day(year: int, month: int, day: int) -> int:
    """Clamp day to the valid calendar day range [1, last_day_of_month]."""
    last_day = calendar.monthrange(year, month)[1]
    return max(1, min(day, last_day))


def next_recurring_date(now: datetime, day: int) -> datetime:
    """
    Return the next recurring date for a given day of month on or after `now`.
    If the date in the current month is on or after `now.date()`, return that date.
    Otherwise, return the date in the following month.
    Handles month-end clamping (e.g. day 31 in 30-day or Feb months).
    """
    safe_current_day = safe_day(now.year, now.month, day)
    current_month_date = now.replace(
        day=safe_current_day, hour=0, minute=0, second=0, microsecond=0
    )
    if current_month_date.date() >= now.date():
        return current_month_date

    # Anchor to 1st of next month by adding 32 days from 1st of current month
    next_month_anchor = (now.replace(day=1) + timedelta(days=32)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    next_safe_day = safe_day(next_month_anchor.year, next_month_anchor.month, day)
    return next_month_anchor.replace(day=next_safe_day)


def parse_payday(payday: str | None) -> int | None:
    """Extract integer day (1-31) from payday string."""
    if not payday:
        return None
    numeric = "".join(ch for ch in str(payday) if ch.isdigit())
    if not numeric:
        return None
    parsed = int(numeric)
    if parsed < 1 or parsed > 31:
        return None
    return parsed


def monthly_multiplier(frequency: str | None) -> Decimal:
    """Return multiplier to convert an amount with given frequency to monthly equivalent."""
    value = (frequency or "monthly").strip().lower()
    if value == "monthly":
        return Decimal("1")
    if value == "weekly":
        return Decimal("52") / Decimal("12")
    if value == "biweekly":
        return Decimal("26") / Decimal("12")
    if value == "yearly":
        return Decimal("1") / Decimal("12")
    if value == "daily":
        return Decimal("30")
    return Decimal("1")


def next_income_date(
    now: datetime, income_sources: Sequence[Any]
) -> tuple[date, str, Optional[date]]:
    """
    Resolve the horizon end date and source from income sources.
    Returns: (horizon_end_date, horizon_source, next_income_date)
    where horizon_source is 'next_income_date' or 'month_end_fallback'.
    """
    salary_dates: List[datetime] = []
    for income in income_sources:
        if not getattr(income, "active", True):
            continue
        salary_day = parse_payday(getattr(income, "payday", None))
        if salary_day is None:
            continue
        rec_date = next_recurring_date(now, salary_day)
        salary_dates.append(rec_date)

    if salary_dates:
        earliest = min(salary_dates)
        return earliest.date(), "next_income_date", earliest.date()

    # Fallback to final day of current calendar month
    last_day = calendar.monthrange(now.year, now.month)[1]
    fallback_date = date(now.year, now.month, last_day)
    return fallback_date, "month_end_fallback", None
