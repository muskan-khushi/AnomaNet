"""
ml/modules/profile_mismatch/inference.py

Profile mismatch scoring via LSTM autoencoder reconstruction error.
Owner: Rupali (implemented here for solo run)

THE exposed function:
    score(account_id: str) -> float   [0.0 – 1.0]

Called by:  Muskan via interfaces.score_profile_mismatch(account_id)
Latency:    < 50ms (CPU inference, batch_size=1)

How it works:
    1. Fetch account's last 30 transactions from Neo4j (or Redis cache)
    2. Build feature sequence tensor (batch=1, seq=30, features=7)
    3. Run through the KYC-tier-specific autoencoder
    4. Reconstruction MSE → normalise to [0,1] using calibrated thresholds
    5. Return normalised score

Fallback (if model not loaded or < 5 transactions available):
    Rule-based fallback:
        monthly_volume > 15× declared_income  → 0.82
        monthly_volume > 5× declared_income   → 0.55
        else                                  → 0.0
"""

from __future__ import annotations

import logging
import math
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import torch
import numpy as np

from .autoencoder import (
    ProfileAutoencoder,
    FEATURE_DIM, SEQ_LEN,
    CHANNEL_MAP, NUM_CHANNELS, TIER_SUFFIXES,
)

log = logging.getLogger(__name__)

# ── Model cache (loaded once per process) ────────────────────────────────────

_MODELS_DIR = Path(__file__).parent.parent.parent / "core" / "models"
_loaded_models: dict[str, ProfileAutoencoder] = {}

# Calibrated thresholds per tier: (clean_mean_mse, clean_std_mse)
# Used to normalise raw MSE → [0,1] via sigmoid-like transform
# These are set from training; fallback values here are reasonable defaults
_THRESHOLDS: dict[str, tuple[float, float]] = {
    "LOW":    (0.04, 0.02),
    "MEDIUM": (0.06, 0.03),
    "HIGH":   (0.10, 0.05),
    "PEP":    (0.08, 0.04),
}


def _load_model(tier: str) -> Optional[ProfileAutoencoder]:
    """Load the autoencoder for a given KYC tier. Cached after first load."""
    if tier in _loaded_models:
        return _loaded_models[tier]

    suffix   = TIER_SUFFIXES.get(tier, "low")
    pt_path  = _MODELS_DIR / f"profile_mismatch_{suffix}.pt"

    if not pt_path.exists():
        log.warning("Profile mismatch model not found: %s — using rule fallback", pt_path)
        return None

    try:
        model = ProfileAutoencoder()
        model.load_state_dict(torch.load(pt_path, map_location="cpu", weights_only=True))
        model.eval()
        _loaded_models[tier] = model
        log.info("Loaded profile mismatch model: %s", pt_path.name)
        return model
    except Exception as e:
        log.error("Failed to load profile mismatch model %s: %s", pt_path, e)
        return None


# ── Feature engineering ───────────────────────────────────────────────────────

def _build_feature_vector(tx: dict) -> list[float]:
    """
    Convert a single transaction dict to a 7-dim feature vector.

    Features:
        [0] normalised_amount   — log1p(amount) / log1p(10_000_000)  → [0,1]
        [1] channel_norm        — channel_idx / num_channels
        [2] hour_sin            — sin(2π × hour / 24)
        [3] hour_cos            — cos(2π × hour / 24)
        [4] is_cross_branch     — 1.0 / 0.0
        [5] is_international    — 1.0 if SWIFT else 0.0
        [6] day_of_week_sin     — sin(2π × day / 7)
    """
    amount  = float(tx.get("amount", 0))
    channel = tx.get("channel", "UNKNOWN")
    ts_raw  = tx.get("initiated_at") or tx.get("ts")

    # Parse timestamp
    if isinstance(ts_raw, (int, float)):
        dt = datetime.fromtimestamp(ts_raw, tz=timezone.utc)
    elif isinstance(ts_raw, str):
        try:
            dt = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
        except ValueError:
            dt = datetime.now(tz=timezone.utc)
    elif isinstance(ts_raw, datetime):
        dt = ts_raw
    else:
        dt = datetime.now(tz=timezone.utc)

    hour        = dt.hour
    dow         = dt.weekday()
    channel_idx = CHANNEL_MAP.get(channel, CHANNEL_MAP["UNKNOWN"])

    normalised_amount = math.log1p(amount) / math.log1p(10_000_000)
    channel_norm      = channel_idx / NUM_CHANNELS
    hour_sin          = math.sin(2 * math.pi * hour / 24)
    hour_cos          = math.cos(2 * math.pi * hour / 24)
    is_cross_branch   = 1.0 if tx.get("is_cross_branch", False) else 0.0
    is_international  = 1.0 if channel == "SWIFT" else 0.0
    dow_sin           = math.sin(2 * math.pi * dow / 7)

    return [
        normalised_amount,
        channel_norm,
        hour_sin,
        hour_cos,
        is_cross_branch,
        is_international,
        dow_sin,
    ]


def _build_sequence_tensor(transactions: list[dict]) -> torch.Tensor:
    """
    Build (1, SEQ_LEN, FEATURE_DIM) tensor from list of transaction dicts.
    Pads with zeros if < SEQ_LEN transactions.
    Truncates to last SEQ_LEN if more.
    """
    # Take last SEQ_LEN transactions (most recent)
    txns = transactions[-SEQ_LEN:]

    vectors = [_build_feature_vector(tx) for tx in txns]

    # Pad to SEQ_LEN with zeros
    while len(vectors) < SEQ_LEN:
        vectors.insert(0, [0.0] * FEATURE_DIM)

    arr = np.array(vectors, dtype=np.float32)   # (SEQ_LEN, FEATURE_DIM)
    return torch.tensor(arr).unsqueeze(0)        # (1, SEQ_LEN, FEATURE_DIM)


def _normalise_mse(raw_mse: float, tier: str) -> float:
    """
    Convert raw MSE reconstruction error to a [0,1] anomaly score.

    Uses calibrated (mean, std) per KYC tier:
        z = (mse - mean) / std
        score = sigmoid(z)   → bounded [0,1], ~0.5 at threshold
    """
    mean, std = _THRESHOLDS.get(tier, (0.05, 0.025))
    if std == 0:
        std = 0.001
    z = (raw_mse - mean) / std
    score = 1.0 / (1.0 + math.exp(-z))   # sigmoid
    return round(min(max(score, 0.0), 1.0), 4)


# ── Rule-based fallback ───────────────────────────────────────────────────────

def _rule_based_score(
    account_id:             str,
    declared_monthly_income: float,
    recent_transactions:    list[dict],
) -> float:
    """
    Deterministic rule: compare 30-day transaction volume vs declared income.
    Used when autoencoder model is unavailable or < 5 transactions.
    """
    if declared_monthly_income <= 0 or not recent_transactions:
        return 0.0

    now   = datetime.now(tz=timezone.utc)
    t_30d = now - timedelta(days=30)

    monthly_volume = 0.0
    for tx in recent_transactions:
        ts_raw = tx.get("initiated_at") or tx.get("ts")
        try:
            if isinstance(ts_raw, str):
                dt = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
            elif isinstance(ts_raw, (int, float)):
                dt = datetime.fromtimestamp(ts_raw, tz=timezone.utc)
            else:
                dt = now
            if dt >= t_30d:
                monthly_volume += float(tx.get("amount", 0))
        except Exception:
            continue

    ratio = monthly_volume / declared_monthly_income

    if ratio > 15:
        return 0.82
    elif ratio > 5:
        return round(0.3 + (ratio - 5) / 10 * 0.52, 4)   # linear 0.30→0.82 between 5×–15×
    else:
        return 0.0


# ── Public interface ──────────────────────────────────────────────────────────

def score(
    account_id: str,
    *,
    kyc_tier:               str        = "LOW",
    declared_monthly_income: float     = 0.0,
    recent_transactions:    Optional[list[dict]] = None,
) -> float:
    """
    Compute profile mismatch score for account_id.

    Args:
        account_id:              Target account ID
        kyc_tier:                KYC risk tier (LOW/MEDIUM/HIGH/PEP)
        declared_monthly_income: From KYC form, in INR
        recent_transactions:     List of recent transaction dicts
                                 (fetched externally or passed in)

    Returns:
        float [0.0 – 1.0] — anomaly score
        0.0 = behaviour matches declared profile
        1.0 = extreme mismatch
    """
    txns = recent_transactions or []

    # Need at least 5 transactions for meaningful autoencoder scoring
    if len(txns) < 5:
        return _rule_based_score(account_id, declared_monthly_income, txns)

    # Try autoencoder scoring
    model = _load_model(kyc_tier)
    if model is None:
        return _rule_based_score(account_id, declared_monthly_income, txns)

    try:
        with torch.no_grad():
            x         = _build_sequence_tensor(txns)           # (1, 30, 7)
            mse       = model.reconstruction_error(x)          # (1,)
            raw_mse   = mse.item()
            normalised = _normalise_mse(raw_mse, kyc_tier)

        log.debug(
            "profile_mismatch(%s) tier=%s raw_mse=%.4f score=%.4f",
            account_id, kyc_tier, raw_mse, normalised
        )
        return normalised

    except Exception as e:
        log.error("profile_mismatch autoencoder failed for %s: %s", account_id, e)
        return _rule_based_score(account_id, declared_monthly_income, txns)