"""
ml/modules/explainability/generator.py

Plain-English explanation generator for AnomaNet alerts.
Owner: Rupali (implemented here for solo run)

Main function:
    get_explanation(alert_id, score_breakdown, context=None) -> str

Called by:
    - Muskan's interfaces.get_explanation()
    - Rupali's explainability router POST /ml/explain
    - Ratnesh's report-service (via /ml/explain endpoint)

The generator uses real transaction context when available,
falling back to score-based templates when context is not provided.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

from .templates import (
    CIRCULAR_TEMPLATE,
    LAYERING_TEMPLATE,
    STRUCTURING_TEMPLATE,
    DORMANT_TEMPLATE,
    PROFILE_MISMATCH_TEMPLATE,
    COMPOSITE_TEMPLATE,
    GENERIC_TEMPLATE,
    score_label,
)

log = logging.getLogger(__name__)

_GRAPH_SERVICE_URL = os.getenv("GRAPH_SERVICE_URL", "http://localhost:8084")
_ALERT_SERVICE_URL = os.getenv("ALERT_SERVICE_URL", "http://localhost:8082")

# INR formatting helper
def _inr(amount: float) -> str:
    """Format amount as Indian number system string (e.g. 9,50,000)."""
    amount = int(round(amount))
    if amount < 1000:
        return str(amount)
    # Indian number system grouping
    s = str(amount)
    if len(s) <= 3:
        return s
    last3 = s[-3:]
    rest = s[:-3]
    groups = []
    while len(rest) > 2:
        groups.append(rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.append(rest)
    groups.reverse()
    return ",".join(groups) + "," + last3


def _fetch_alert_context(alert_id: str) -> dict:
    """
    Attempt to fetch alert details from alert-service.
    Returns empty dict on any failure (graceful degradation).
    """
    try:
        resp = httpx.get(
            f"{_ALERT_SERVICE_URL}/api/alerts/{alert_id}",
            timeout=2.0,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        log.debug("Could not fetch alert context for %s: %s", alert_id, e)
    return {}


def _fetch_cycle_info(account_id: str) -> dict:
    """Fetch cycle detection info from graph-service."""
    try:
        resp = httpx.post(
            f"{_GRAPH_SERVICE_URL}/api/graph/cycles",
            json={"accountId": account_id, "maxLength": 7, "hours": 168},
            timeout=2.0,
        )
        if resp.status_code == 200:
            cycles = resp.json()
            if cycles:
                return cycles[0]   # return most relevant cycle
    except Exception as e:
        log.debug("Could not fetch cycle info for %s: %s", account_id, e)
    return {}


# ── Pattern-specific explanation builders ────────────────────────────────────

def _explain_circular(score: float, context: dict, alert_context: dict) -> str:
    cycle = context.get("cycle") or _fetch_cycle_info(
        alert_context.get("account_id", "")
    )

    if cycle and cycle.get("path") and len(cycle["path"]) >= 3:
        path          = cycle["path"]
        amounts       = cycle.get("amounts", [])
        completion_h  = round(cycle.get("completion_hours", 0), 1)
        branches      = cycle.get("branches", [])
        first_time    = cycle.get("first_time_relationships", 0)

        def fmt_amt(i: int) -> str:
            return _inr(amounts[i]) if i < len(amounts) else "N/A"

        # Build extra hops string for cycles > 3
        extra = ""
        if len(path) > 3:
            mid = ", ".join(
                f"₹{_inr(amounts[i])} to account {path[i+1]}"
                for i in range(1, len(path) - 2)
                if i < len(amounts)
            )
            extra = f", which transferred {mid},"

        branch_desc = (
            f"branches in {' and '.join(set(branches[:4]))}"
            if branches else "multiple branches"
        )

        first_time_note = (
            f"{first_time} of the {len(path)-1} counterparty relationships "
            f"in this cycle were first-time transactions. "
            if first_time > 0 else ""
        )

        variance = cycle.get("amount_variance_pct", 5)

        return CIRCULAR_TEMPLATE.substitute(
            account_a      = path[0],
            amount_a       = _inr(amounts[0]) if amounts else "N/A",
            account_b      = path[1],
            amount_b       = fmt_amt(1),
            account_c      = path[2] if len(path) > 2 else path[-1],
            extra_hops     = extra,
            cycle_hours    = completion_h,
            branch_desc    = branch_desc,
            first_time_note = first_time_note,
            variance_pct   = round(variance, 1),
        )

    # Fallback
    acct = alert_context.get("account_id", "this account")
    return (
        f"A directed financial cycle (round-tripping) was detected involving account {acct}. "
        f"Funds returned to the originating account after passing through intermediate accounts, "
        f"a pattern consistent with creating the illusion of legitimate trade activity. "
        f"Circular transaction score: {score:.2f} ({score_label(score)})."
    )


def _explain_layering(score: float, context: dict, alert_context: dict) -> str:
    acct          = alert_context.get("account_id", "this account")
    tx_count_1h   = context.get("tx_count_1h", 0)
    inbound_amt   = context.get("inbound_amount", 0)
    residency_s   = context.get("residency_seconds", 0)
    residency_min = round(residency_s / 60, 1) if residency_s else "a few"
    counterparts  = context.get("counterparties", [])
    branch_count  = context.get("branch_count", 1)
    is_off_hours  = context.get("is_off_hours", False)

    cp_list = (
        ", ".join(counterparts[:5]) + ("..." if len(counterparts) > 5 else "")
        if counterparts else "multiple accounts"
    )
    fan_out = len(counterparts) if counterparts else context.get("fan_out_count", tx_count_1h)
    off_note = (
        "Notably, this activity occurred during off-peak hours (2–5 AM), "
        "a common pattern in automated layering schemes. "
        if is_off_hours else ""
    )

    return LAYERING_TEMPLATE.substitute(
        account_id         = acct,
        inbound_amount     = _inr(inbound_amt) if inbound_amt else "significant funds",
        residency_minutes  = residency_min,
        fan_out_count      = fan_out,
        counterparty_list  = cp_list,
        branch_count       = branch_count,
        branch_plural      = "es" if branch_count != 1 else "",
        off_hours_note     = off_note,
        tx_count_1h        = tx_count_1h,
    )


def _explain_structuring(score: float, context: dict, alert_context: dict) -> str:
    acct         = alert_context.get("account_id", "this account")
    tx_count     = context.get("tx_count", 3)
    total_amount = context.get("total_amount", 0)
    amounts      = context.get("amounts", [])
    period_days  = context.get("period_days", 7)
    threshold    = context.get("threshold_lakhs", 10)
    branches     = context.get("branch_count", 1)

    amt_list = (
        "₹" + ", ₹".join(_inr(a) for a in amounts[:5])
        if amounts else "multiple amounts"
    )
    branch_note = (
        f"The deposits were spread across {branches} different branches, "
        f"a smurfing pattern designed to further obscure the pattern. "
        if branches > 1 else ""
    )

    return STRUCTURING_TEMPLATE.substitute(
        account_id   = acct,
        tx_count     = tx_count,
        total_amount = _inr(total_amount) if total_amount else "N/A",
        period_days  = period_days,
        amount_list  = amt_list,
        threshold    = threshold,
        branch_note  = branch_note,
    )


def _explain_dormant(score: float, context: dict, alert_context: dict) -> str:
    acct             = alert_context.get("account_id", "this account")
    dormancy_months  = context.get("dormancy_months", 0)
    last_tx_date     = context.get("last_tx_date", "over a year ago")
    activation_date  = context.get("activation_date", "recently")
    activation_amt   = context.get("activation_amount", 0)
    historical_avg   = context.get("historical_avg", 1)
    multiple_x       = round(activation_amt / max(historical_avg, 1))
    outbound_hours   = context.get("outbound_hours")

    outbound_note = ""
    if outbound_hours is not None:
        outbound_note = (
            f"The account then made an outbound transfer within {outbound_hours:.1f} hours "
            f"of receiving the funds, suggesting a pre-planned pass-through operation. "
        )

    return DORMANT_TEMPLATE.substitute(
        account_id        = acct,
        dormancy_months   = dormancy_months,
        last_tx_date      = last_tx_date,
        activation_date   = activation_date,
        activation_amount = _inr(activation_amt) if activation_amt else "a large sum",
        multiple_x        = multiple_x,
        historical_avg    = _inr(historical_avg) if historical_avg else "N/A",
        outbound_note     = outbound_note,
    )


def _explain_profile_mismatch(score: float, context: dict, alert_context: dict) -> str:
    acct            = alert_context.get("account_id", "this account")
    occupation      = context.get("occupation", "unknown")
    declared_income = context.get("declared_monthly_income", 0)
    monthly_volume  = context.get("monthly_volume", 0)
    income_multiple = round(monthly_volume / max(declared_income, 1))
    channel         = context.get("dominant_channel", "")
    new_cp_ratio    = context.get("new_counterparty_ratio_30d", 0)

    channel_note = ""
    if channel in ("SWIFT", "RTGS") and occupation.lower() in (
        "farmer", "student", "retired", "pensioner", "housewife", "daily wage"
    ):
        channel_note = (
            f"The account is using {channel} transfers — a channel inconsistent "
            f"with the declared occupation of '{occupation}'. "
        )

    cp_note = ""
    if new_cp_ratio > 0.7:
        cp_note = (
            f"{round(new_cp_ratio * 100)}% of counterparties in the last 30 days "
            f"are first-time relationships, indicating a sudden expansion of the "
            f"transaction network beyond the account's historical footprint. "
        )

    return PROFILE_MISMATCH_TEMPLATE.substitute(
        account_id       = acct,
        occupation       = occupation,
        declared_income  = _inr(declared_income) if declared_income else "undisclosed",
        monthly_volume   = _inr(monthly_volume) if monthly_volume else "N/A",
        income_multiple  = income_multiple,
        channel_note     = channel_note,
        counterparty_note = cp_note,
        mismatch_score   = score,
    )


# ── Main public function ──────────────────────────────────────────────────────

def get_explanation(
    alert_id:        str,
    score_breakdown: dict,
    context:         Optional[dict] = None,
) -> str:
    """
    Generate a plain-English explanation for an AnomaNet alert.

    Args:
        alert_id:        UUID of the alert
        score_breakdown: {layering, circular, structuring, dormancy,
                          profile_mismatch} — each a float 0–1
        context:         Optional extra data (cycle path, amounts, etc.)
                         If not provided, fetched from backend services.

    Returns:
        str — 2–4 sentence explanation paragraph
    """
    if not score_breakdown:
        return (
            f"Alert {alert_id} was flagged by AnomaNet's composite fraud detection pipeline. "
            "Detailed pattern analysis is pending."
        )

    ctx           = context or {}
    alert_context = ctx.get("alert_context") or _fetch_alert_context(alert_id)

    # Find dominant pattern and all patterns above threshold
    threshold = 0.4
    active_patterns = {
        k: v for k, v in score_breakdown.items()
        if isinstance(v, (int, float)) and v >= threshold
    }

    if not active_patterns:
        dominant = max(score_breakdown, key=lambda k: score_breakdown.get(k, 0))
        return (
            f"Alert {alert_id}: AnomaScore elevated with primary signal from "
            f"{dominant.replace('_', ' ')} detector "
            f"(score: {score_breakdown[dominant]:.2f})."
        )

    dominant       = max(active_patterns, key=active_patterns.get)
    dominant_score = active_patterns[dominant]

    # Generate primary explanation from dominant pattern
    pattern_builders = {
        "circular":         _explain_circular,
        "layering":         _explain_layering,
        "structuring":      _explain_structuring,
        "dormancy":         _explain_dormant,
        "profile_mismatch": _explain_profile_mismatch,
    }

    builder = pattern_builders.get(dominant)
    if builder:
        try:
            primary = builder(dominant_score, ctx, alert_context)
        except Exception as e:
            log.error("Explanation builder for %s failed: %s", dominant, e)
            primary = (
                f"The {dominant.replace('_', ' ')} detector flagged this account "
                f"with a score of {dominant_score:.2f} ({score_label(dominant_score)})."
            )
    else:
        primary = (
            f"The {dominant.replace('_', ' ')} detector flagged this account "
            f"with a score of {dominant_score:.2f}."
        )

    # Append composite note if multiple patterns active
    other_active = [k for k in active_patterns if k != dominant]
    if other_active and len(active_patterns) >= 2:
        anoma_score = ctx.get("anoma_score", sum(active_patterns.values()) / len(active_patterns))
        threshold_used = ctx.get("threshold_used", 0.65)
        pattern_list = " and ".join(
            p.replace("_", " ") for p in list(active_patterns.keys())[:3]
        )
        composite = COMPOSITE_TEMPLATE.substitute(
            pattern_list     = pattern_list,
            anoma_score      = anoma_score,
            threshold        = threshold_used,
            dominant_pattern = dominant.replace("_", " "),
            dominant_score   = dominant_score,
        )
        return primary + "\n\n" + composite

    return primary