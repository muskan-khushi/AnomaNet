"""
ml/shared/feature_store/redis_store.py

Rolling-window feature cache using Redis Sorted Sets.
Owner: Rupali (implemented here for solo run)

Each account's transactions are stored in a Redis Sorted Set:
    key:    "txns:{account_id}"
    member: JSON blob  { amount, channel, branch_id, counterparty_id, ts }
    score:  Unix timestamp  (enables fast time-range queries via ZRANGEBYSCORE)

Exported functions (called by Muskan via ml/interfaces.py):
    set_transaction(account_id, amount, channel, branch_id,
                    counterparty_id, ts)  -> None
    get_rolling_features(account_id)      -> dict

Feature dict keys (all keys guaranteed present, zero if no data):
    tx_count_1h               int    - transactions in last 1 hour
    tx_count_24h              int    - transactions in last 24 hours
    total_amount_24h          float  - total INR transferred in 24h
    unique_counterparties_24h int    - distinct counterparties in 24h
    avg_tx_amount_30d         float  - average transaction amount over 30 days
    channel_entropy           float  - Shannon entropy of channel distribution (30d)
    cross_branch_ratio        float  - fraction of 30d txns to different branches
"""

from __future__ import annotations

import json
import logging
import math
import os
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Optional

import redis

log = logging.getLogger(__name__)

# ── Redis connection ──────────────────────────────────────────────────────────

_REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
_REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
_REDIS_DB   = int(os.getenv("REDIS_DB", "0"))

# TTL for sorted sets: 35 days (covers 30d window + buffer)
_TTL_SECONDS = 35 * 24 * 3600

# Keep at most 2000 entries per account to bound memory
_MAX_ENTRIES = 2000

_client: Optional[redis.Redis] = None


def _get_client() -> redis.Redis:
    """Lazy singleton Redis client with reconnect on failure."""
    global _client
    if _client is None:
        _client = redis.Redis(
            host=_REDIS_HOST,
            port=_REDIS_PORT,
            db=_REDIS_DB,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
            retry_on_timeout=True,
        )
    return _client


def _key(account_id: str) -> str:
    return f"txns:{account_id}"


# ── Write ─────────────────────────────────────────────────────────────────────

def set_transaction(
    account_id:     str,
    amount:         float,
    channel:        str        = "UNKNOWN",
    branch_id:      str        = "UNKNOWN",
    counterparty_id: str       = "UNKNOWN",
    ts:             Optional[datetime] = None,
) -> None:
    """
    Store a transaction event in Redis for feature computation.

    Args:
        account_id:      The source account being tracked
        amount:          Transaction amount in INR
        channel:         NEFT / RTGS / IMPS / UPI / SWIFT / CASH / BRANCH
        branch_id:       Originating branch IFSC
        counterparty_id: Destination account ID
        ts:              Transaction timestamp (defaults to now)
    """
    if ts is None:
        ts = datetime.now(tz=timezone.utc)

    unix_ts = ts.timestamp()
    member  = json.dumps({
        "amount":         round(amount, 2),
        "channel":        channel,
        "branch_id":      branch_id,
        "counterparty_id": counterparty_id,
        "ts":             unix_ts,
    })

    try:
        r   = _get_client()
        key = _key(account_id)

        pipe = r.pipeline(transaction=False)
        pipe.zadd(key, {member: unix_ts})          # add with timestamp score
        pipe.expire(key, _TTL_SECONDS)             # refresh TTL
        pipe.zremrangebyrank(key, 0, -_MAX_ENTRIES - 1)  # trim oldest if overflow
        pipe.execute()

    except redis.RedisError as e:
        log.warning("set_transaction failed for %s: %s", account_id, e)


# ── Read ──────────────────────────────────────────────────────────────────────

def get_rolling_features(account_id: str) -> dict:
    """
    Compute rolling-window features for account_id from Redis.

    Returns a dict with guaranteed keys (zeros if no data or Redis down):
        tx_count_1h, tx_count_24h, total_amount_24h,
        unique_counterparties_24h, avg_tx_amount_30d,
        channel_entropy, cross_branch_ratio

    Called by: Muskan via interfaces.get_rolling_features()
    Latency target: < 10ms (all operations are O(log N) range queries)
    """
    _ZERO = {
        "tx_count_1h":               0,
        "tx_count_24h":              0,
        "total_amount_24h":          0.0,
        "unique_counterparties_24h": 0,
        "avg_tx_amount_30d":         0.0,
        "channel_entropy":           0.0,
        "cross_branch_ratio":        0.0,
    }

    try:
        r   = _get_client()
        key = _key(account_id)
        now = time.time()

        # Time boundaries (Unix timestamps)
        t_1h  = now - 3_600
        t_24h = now - 86_400
        t_30d = now - 30 * 86_400

        # Fetch all entries in the last 30 days (covers all windows)
        raw_30d: list[str] = r.zrangebyscore(key, t_30d, "+inf")

        if not raw_30d:
            return dict(_ZERO)

        # Parse once, filter into windows
        entries_30d: list[dict] = []
        for raw in raw_30d:
            try:
                entries_30d.append(json.loads(raw))
            except json.JSONDecodeError:
                continue

        entries_24h = [e for e in entries_30d if e["ts"] >= t_24h]
        entries_1h  = [e for e in entries_24h  if e["ts"] >= t_1h]

        # ── 1-hour features ──────────────────────────────────────────────────
        tx_count_1h = len(entries_1h)

        # ── 24-hour features ─────────────────────────────────────────────────
        tx_count_24h              = len(entries_24h)
        total_amount_24h          = sum(e["amount"] for e in entries_24h)
        unique_counterparties_24h = len({e["counterparty_id"] for e in entries_24h})

        # ── 30-day features ──────────────────────────────────────────────────
        amounts_30d    = [e["amount"] for e in entries_30d]
        avg_tx_amount_30d = sum(amounts_30d) / len(amounts_30d)

        # Channel entropy: H = -Σ p_i * log2(p_i)
        # High entropy → mixed channels (normal); low → single channel (suspicious)
        channel_counts = Counter(e["channel"] for e in entries_30d)
        total_30d      = len(entries_30d)
        channel_entropy = 0.0
        for count in channel_counts.values():
            p = count / total_30d
            if p > 0:
                channel_entropy -= p * math.log2(p)

        # Cross-branch ratio: fraction of txns from a different branch
        # (uses first seen branch as "home branch" — simple but effective)
        if total_30d >= 2:
            branch_counts  = Counter(e["branch_id"] for e in entries_30d)
            home_branch    = branch_counts.most_common(1)[0][0]
            cross_branch   = sum(1 for e in entries_30d if e["branch_id"] != home_branch)
            cross_branch_ratio = cross_branch / total_30d
        else:
            cross_branch_ratio = 0.0

        return {
            "tx_count_1h":               tx_count_1h,
            "tx_count_24h":              tx_count_24h,
            "total_amount_24h":          round(total_amount_24h, 2),
            "unique_counterparties_24h": unique_counterparties_24h,
            "avg_tx_amount_30d":         round(avg_tx_amount_30d, 2),
            "channel_entropy":           round(channel_entropy, 4),
            "cross_branch_ratio":        round(cross_branch_ratio, 4),
        }

    except redis.RedisError as e:
        log.warning("get_rolling_features(%s) Redis error: %s — returning zeros", account_id, e)
        return dict(_ZERO)
    except Exception as e:
        log.error("get_rolling_features(%s) unexpected error: %s", account_id, e)
        return dict(_ZERO)


# ── Utility: bulk-load historical transactions (called by data_simulator) ────

def bulk_load_transactions(
    account_id: str,
    transactions: list[dict],
) -> int:
    """
    Load a list of historical transactions into Redis for an account.
    Used by the data simulator to pre-populate feature store.

    Each dict must have: amount, channel, branch_id, counterparty_id, ts (ISO string or float)
    Returns: number of entries successfully written
    """
    if not transactions:
        return 0

    try:
        r       = _get_client()
        key     = _key(account_id)
        mapping = {}

        for tx in transactions:
            ts_raw = tx.get("ts", time.time())
            if isinstance(ts_raw, str):
                try:
                    ts_raw = datetime.fromisoformat(ts_raw).timestamp()
                except ValueError:
                    ts_raw = time.time()

            member = json.dumps({
                "amount":         round(float(tx.get("amount", 0)), 2),
                "channel":        tx.get("channel", "UNKNOWN"),
                "branch_id":      tx.get("branch_id", "UNKNOWN"),
                "counterparty_id": tx.get("counterparty_id", "UNKNOWN"),
                "ts":             float(ts_raw),
            })
            mapping[member] = float(ts_raw)

        pipe = r.pipeline(transaction=False)
        pipe.zadd(key, mapping)
        pipe.expire(key, _TTL_SECONDS)
        pipe.zremrangebyrank(key, 0, -_MAX_ENTRIES - 1)
        pipe.execute()
        return len(mapping)

    except redis.RedisError as e:
        log.warning("bulk_load_transactions(%s) failed: %s", account_id, e)
        return 0


# ── Health check ─────────────────────────────────────────────────────────────

def health_check() -> bool:
    """Returns True if Redis is reachable."""
    try:
        return _get_client().ping()
    except Exception:
        return False