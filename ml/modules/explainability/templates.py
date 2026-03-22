"""
ml/modules/explainability/templates.py

Plain-English explanation templates for all 5 AnomaNet fraud patterns.
Owner: Rupali (implemented here for solo run)

Each template is parameterised with detected values for maximum specificity.
The generator fills these templates with real transaction data.
"""

from __future__ import annotations

from string import Template


# ── Per-pattern template definitions ─────────────────────────────────────────

# Template variables use ${var} syntax (Python string.Template)

CIRCULAR_TEMPLATE = Template(
    "Account ${account_a} transferred ₹${amount_a} to account ${account_b}, "
    "which transferred ₹${amount_b} to account ${account_c}"
    "${extra_hops}"
    " — completing a financial cycle in ${cycle_hours} hours "
    "across ${branch_desc}. "
    "${first_time_note}"
    "The amounts across the cycle are within ${variance_pct}% of each other, "
    "consistent with round-tripping to simulate legitimate trade activity."
)

LAYERING_TEMPLATE = Template(
    "Account ${account_id} received ₹${inbound_amount} and within ${residency_minutes} minutes "
    "distributed funds to ${fan_out_count} different accounts "
    "(${counterparty_list}) "
    "across ${branch_count} branch${branch_plural}. "
    "This rapid fan-out pattern — with money residency under ${residency_minutes} minutes — "
    "is characteristic of Phase 2 (Layering) of the money laundering cycle. "
    "${off_hours_note}"
    "Velocity: ${tx_count_1h} transactions in the last hour from this account."
)

STRUCTURING_TEMPLATE = Template(
    "Account ${account_id} made ${tx_count} cash transactions totalling ₹${total_amount} "
    "within ${period_days} days, with individual amounts of ${amount_list} — "
    "each deliberately kept below the ₹${threshold} lakh Cash Transaction Report (CTR) threshold. "
    "The aggregate of ₹${total_amount} would ordinarily trigger a mandatory CTR filing to FIU-IND. "
    "${branch_note}"
    "This clustering pattern is consistent with structuring (smurfing) to evade regulatory reporting."
)

DORMANT_TEMPLATE = Template(
    "Account ${account_id} had been dormant for ${dormancy_months} months "
    "(last transaction: ${last_tx_date}). "
    "On ${activation_date}, the account received ₹${activation_amount} — "
    "${multiple_x}× its historical average transaction of ₹${historical_avg}. "
    "${outbound_note}"
    "This sudden high-value activation after prolonged dormancy is a strong indicator of "
    "account takeover or a pre-planted account used for a single fraud event."
)

PROFILE_MISMATCH_TEMPLATE = Template(
    "Account ${account_id} (declared occupation: ${occupation}, "
    "declared monthly income: ₹${declared_income}) "
    "processed ₹${monthly_volume} in transactions over the last 30 days — "
    "${income_multiple}× the declared monthly income. "
    "${channel_note}"
    "${counterparty_note}"
    "The account's transaction behaviour deviates significantly from its declared KYC profile "
    "(reconstruction anomaly score: ${mismatch_score:.2f}), "
    "suggesting undisclosed income sources or account misuse."
)

COMPOSITE_TEMPLATE = Template(
    "This account triggered multiple fraud indicators simultaneously: "
    "${pattern_list}. "
    "The composite AnomaScore of ${anoma_score:.2f} (threshold: ${threshold:.2f}) "
    "reflects the combined risk across all active patterns. "
    "The dominant signal is ${dominant_pattern} (score: ${dominant_score:.2f})."
)

# ── Severity labels ───────────────────────────────────────────────────────────

def score_label(score: float) -> str:
    """Returns a severity label for a given pattern score."""
    if score >= 0.80:
        return "CRITICAL"
    elif score >= 0.65:
        return "HIGH"
    elif score >= 0.45:
        return "MEDIUM"
    else:
        return "LOW"


# ── Generic fallback ──────────────────────────────────────────────────────────

GENERIC_TEMPLATE = Template(
    "Alert ${alert_id} was triggered because account ${account_id} exhibited "
    "${primary_pattern} behaviour with a risk score of ${primary_score:.2f}. "
    "AnomaNet's composite fraud score of ${anoma_score:.2f} exceeded the "
    "configured alert threshold of ${threshold:.2f}."
)