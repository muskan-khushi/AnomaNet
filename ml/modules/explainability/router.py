"""
ml/modules/explainability/router.py

FastAPI router for the explainability engine.
Muskan adds ONE line to core/main.py: app.include_router(explain_router)

Endpoints:
    POST /ml/explain   — generate plain-English explanation for an alert
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .generator import get_explanation

log = logging.getLogger(__name__)

explain_router = APIRouter(tags=["Explainability"])


class ExplainRequest(BaseModel):
    alert_id:        str
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    context:         Optional[dict]   = None   # optional: cycle path, amounts, etc.


class ExplainResponse(BaseModel):
    alert_id:        str
    explanation:     str
    evidence_points: list[str]
    dominant_pattern: str
    dominant_score:  float


@explain_router.post("/ml/explain", response_model=ExplainResponse)
async def explain_alert(req: ExplainRequest):
    """
    Generate a plain-English explanation for an AnomaNet alert.

    Called by:
        - Frontend ScoreBreakdown component (via /api/alerts/{id}/explanation)
        - Ratnesh's report-service (embedded in FIU report PDF)
    """
    explanation = get_explanation(
        alert_id        = req.alert_id,
        score_breakdown = req.score_breakdown,
        context         = req.context,
    )

    # Build evidence_points: one bullet per active pattern
    evidence_points = []
    for pattern, score in sorted(
        req.score_breakdown.items(), key=lambda x: -x[1]
    ):
        if score >= 0.3:
            label = _severity(score)
            evidence_points.append(
                f"{pattern.replace('_', ' ').title()}: {score:.2f} ({label})"
            )

    dominant       = max(req.score_breakdown, key=lambda k: req.score_breakdown.get(k, 0)) \
                     if req.score_breakdown else "unknown"
    dominant_score = req.score_breakdown.get(dominant, 0.0)

    return ExplainResponse(
        alert_id         = req.alert_id,
        explanation      = explanation,
        evidence_points  = evidence_points,
        dominant_pattern = dominant,
        dominant_score   = dominant_score,
    )


def _severity(score: float) -> str:
    if score >= 0.80: return "CRITICAL"
    if score >= 0.65: return "HIGH"
    if score >= 0.45: return "MEDIUM"
    return "LOW"