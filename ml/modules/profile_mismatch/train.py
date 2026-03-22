"""
ml/modules/profile_mismatch/train.py

Training script for the Profile Mismatch LSTM Autoencoder.
Trains one model per KYC tier (LOW / MEDIUM / HIGH / PEP).

Usage:
    cd ml
    python -m modules.profile_mismatch.train

Requires:
    - ml/data/transactions.parquet   (from Muskan's simulator)
    - ml/data/accounts.parquet
    - MLflow running at MLFLOW_TRACKING_URI

Output:
    ml/core/models/profile_mismatch_{low,medium,high,pep}.pt
    MLflow experiment: profile_mismatch_autoencoder
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Allow running from ml/ root
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from modules.profile_mismatch.autoencoder import (
    ProfileAutoencoder,
    FEATURE_DIM, SEQ_LEN, CHANNEL_MAP, TIER_SUFFIXES,
)
from modules.profile_mismatch.inference import _build_feature_vector

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── Config ────────────────────────────────────────────────────────────────────

DATA_DIR   = Path(__file__).parent.parent.parent / "data"
MODELS_DIR = Path(__file__).parent.parent.parent / "core" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

EPOCHS        = 30
BATCH_SIZE    = 64
LEARNING_RATE = 1e-3
PATIENCE      = 5     # early stopping
DEVICE        = torch.device("cpu")   # CPU is sufficient for inference


# ── Build sequences per account ───────────────────────────────────────────────

def build_sequences(transactions_df: pd.DataFrame, accounts_df: pd.DataFrame) -> dict[str, list]:
    """
    Build per-tier lists of (SEQ_LEN, FEATURE_DIM) numpy arrays.
    Each array = one account's last SEQ_LEN transactions.
    Only uses accounts with no fraud label (clean baseline).
    """
    sequences_by_tier: dict[str, list] = {"LOW": [], "MEDIUM": [], "HIGH": [], "PEP": []}

    # Map account_id → kyc_risk_tier
    tier_map = dict(zip(accounts_df["id"], accounts_df["kyc_risk_tier"]))

    # Group transactions by source account
    grouped = transactions_df.sort_values("initiated_at").groupby("source_account_id")

    for account_id, group in grouped:
        tier = tier_map.get(account_id, "LOW")
        if tier not in sequences_by_tier:
            continue

        txn_rows = group.to_dict("records")
        if len(txn_rows) < 5:
            continue

        # Use last SEQ_LEN transactions
        txn_rows = txn_rows[-SEQ_LEN:]
        vectors  = [_build_feature_vector(tx) for tx in txn_rows]

        # Pad
        while len(vectors) < SEQ_LEN:
            vectors.insert(0, [0.0] * FEATURE_DIM)

        arr = np.array(vectors, dtype=np.float32)
        sequences_by_tier[tier].append(arr)

    for tier, seqs in sequences_by_tier.items():
        log.info("Tier %s: %d account sequences", tier, len(seqs))

    return sequences_by_tier


# ── Training loop ─────────────────────────────────────────────────────────────

def train_one_tier(
    tier:      str,
    sequences: list,
    run_name:  str,
) -> tuple[ProfileAutoencoder, float]:
    """
    Train one autoencoder for a single KYC tier.
    Returns (trained_model, final_val_loss).
    """
    import mlflow

    if not sequences:
        log.warning("No sequences for tier %s — skipping", tier)
        return ProfileAutoencoder(), float("inf")

    data   = np.stack(sequences)                          # (N, SEQ_LEN, FEATURE_DIM)
    tensor = torch.tensor(data, dtype=torch.float32)

    # 80/20 train/val split
    n_train = int(0.8 * len(tensor))
    train_ds = TensorDataset(tensor[:n_train])
    val_ds   = TensorDataset(tensor[n_train:])
    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  drop_last=False)
    val_dl   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, drop_last=False)

    model     = ProfileAutoencoder().to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.MSELoss()

    best_val_loss = float("inf")
    best_state    = None
    patience_ctr  = 0

    with mlflow.start_run(run_name=f"{run_name}_{tier}"):
        mlflow.log_params({
            "tier":          tier,
            "epochs":        EPOCHS,
            "batch_size":    BATCH_SIZE,
            "lr":            LEARNING_RATE,
            "hidden_size":   ProfileAutoencoder().hidden_size,
            "num_layers":    ProfileAutoencoder().num_layers,
            "seq_len":       SEQ_LEN,
            "feature_dim":   FEATURE_DIM,
            "n_train":       n_train,
            "n_val":         len(tensor) - n_train,
        })

        for epoch in range(EPOCHS):
            # ── Train ──
            model.train()
            train_loss = 0.0
            for (batch,) in train_dl:
                batch = batch.to(DEVICE)
                optimizer.zero_grad()
                reconstruction, _ = model(batch)
                loss = criterion(reconstruction, batch)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                train_loss += loss.item() * len(batch)
            train_loss /= n_train

            # ── Validate ──
            model.eval()
            val_loss = 0.0
            with torch.no_grad():
                for (batch,) in val_dl:
                    batch = batch.to(DEVICE)
                    reconstruction, _ = model(batch)
                    val_loss += criterion(reconstruction, batch).item() * len(batch)
            n_val = len(tensor) - n_train
            val_loss /= max(n_val, 1)

            mlflow.log_metrics(
                {"train_loss": train_loss, "val_loss": val_loss},
                step=epoch,
            )

            if (epoch + 1) % 5 == 0:
                log.info("Tier %s | Epoch %d/%d | train=%.5f val=%.5f",
                         tier, epoch + 1, EPOCHS, train_loss, val_loss)

            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state    = {k: v.clone() for k, v in model.state_dict().items()}
                patience_ctr  = 0
            else:
                patience_ctr += 1
                if patience_ctr >= PATIENCE:
                    log.info("Early stopping at epoch %d for tier %s", epoch + 1, tier)
                    break

        # Compute reconstruction error stats on validation set (for calibration)
        model.load_state_dict(best_state)
        model.eval()
        errors = []
        with torch.no_grad():
            for (batch,) in val_dl:
                batch = batch.to(DEVICE)
                err   = model.reconstruction_error(batch)
                errors.extend(err.cpu().numpy().tolist())

        if errors:
            err_mean = float(np.mean(errors))
            err_std  = float(np.std(errors))
            mlflow.log_metrics({
                "val_mse_mean": err_mean,
                "val_mse_std":  err_std,
                "best_val_loss": best_val_loss,
            })
            log.info("Tier %s calibration: mean_mse=%.5f std_mse=%.5f",
                     tier, err_mean, err_std)

        # Save model artifact
        suffix    = TIER_SUFFIXES[tier]
        save_path = MODELS_DIR / f"profile_mismatch_{suffix}.pt"
        torch.save(best_state, save_path)
        mlflow.log_artifact(str(save_path))
        log.info("Saved: %s  (val_loss=%.5f)", save_path.name, best_val_loss)

    return model, best_val_loss


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    import mlflow
    from training.mlflow_config import setup_mlflow  # Muskan's setup

    setup_mlflow()
    mlflow.set_experiment("profile_mismatch_autoencoder")

    # Load data
    log.info("Loading data...")
    try:
        txns_df     = pd.read_parquet(DATA_DIR / "transactions.parquet")
        accounts_df = pd.read_parquet(DATA_DIR / "accounts.parquet")
        labels_df   = pd.read_parquet(DATA_DIR / "labels.parquet")
    except FileNotFoundError as e:
        log.error("Data not found: %s — run data_simulator/simulator.py first", e)
        sys.exit(1)

    # Filter to clean (non-fraud) transactions only for autoencoder training
    fraud_tx_ids = set(labels_df[labels_df["is_fraud"] == True]["transaction_id"])
    log.info("Total transactions: %d | Fraud: %d | Clean: %d",
             len(txns_df), len(fraud_tx_ids),
             len(txns_df) - len(fraud_tx_ids))

    clean_txns = txns_df[~txns_df["id"].isin(fraud_tx_ids)].copy()

    # Build per-tier sequences
    sequences_by_tier = build_sequences(clean_txns, accounts_df)

    # Train one model per tier
    results = {}
    for tier in ["LOW", "MEDIUM", "HIGH", "PEP"]:
        seqs = sequences_by_tier.get(tier, [])
        if not seqs:
            log.warning("Skipping tier %s — no training data", tier)
            continue
        _, val_loss = train_one_tier(tier, seqs, run_name="profile_mismatch")
        results[tier] = val_loss

    log.info("Training complete:")
    for tier, loss in results.items():
        log.info("  %s: val_loss=%.5f", tier, loss)


if __name__ == "__main__":
    main()