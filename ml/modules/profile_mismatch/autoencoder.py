"""
ml/modules/profile_mismatch/autoencoder.py

PyTorch LSTM Autoencoder for customer profile mismatch detection.
Owner: Rupali (implemented here for solo run)

Architecture:
    Encoder: LSTM(input_size=7, hidden=64, layers=2) → latent vector (64-dim)
    Decoder: LSTM(64 → 64, layers=2) → Linear(64 → 7) → reconstructed sequence

Input: sequence of last-N transactions, each as a 7-dim feature vector:
    [normalised_amount, channel_onehot_idx, hour_sin, hour_cos,
     is_cross_branch, is_international, day_of_week_sin]

Training:
    - Trained separately per KYC tier (LOW / MEDIUM / HIGH / PEP)
    - Loss: MSE reconstruction error on clean (non-fraud) sequences
    - At inference: reconstruction error → normalised to [0, 1]
    - High error = behaviour deviates from declared profile → high mismatch score

The model is intentionally simple and fast:
    - Sequence length: up to 30 transactions (padded/truncated)
    - Inference target: < 50ms per account
    - No GPU required for inference
"""

from __future__ import annotations

import torch
import torch.nn as nn


# ── Feature engineering constants ────────────────────────────────────────────

FEATURE_DIM   = 7      # input feature vector size
SEQ_LEN       = 30     # fixed sequence length (pad/truncate)
HIDDEN_SIZE   = 64
NUM_LAYERS    = 2
LATENT_DIM    = 64

# Channel encoding: maps channel string → index for normalisation
CHANNEL_MAP: dict[str, int] = {
    "NEFT":   0,
    "RTGS":   1,
    "IMPS":   2,
    "UPI":    3,
    "SWIFT":  4,
    "CASH":   5,
    "BRANCH": 6,
    "UNKNOWN": 7,
}
NUM_CHANNELS = len(CHANNEL_MAP)

# KYC tier → model file suffix
TIER_SUFFIXES = {
    "LOW":    "low",
    "MEDIUM": "medium",
    "HIGH":   "high",
    "PEP":    "pep",
}


# ── Model definition ──────────────────────────────────────────────────────────

class ProfileAutoencoder(nn.Module):
    """
    LSTM Autoencoder.

    forward(x) returns (reconstruction, latent)
        x:              (batch, seq_len, feature_dim)
        reconstruction: (batch, seq_len, feature_dim)
        latent:         (batch, latent_dim)  — encoder output
    """

    def __init__(
        self,
        input_size:  int = FEATURE_DIM,
        hidden_size: int = HIDDEN_SIZE,
        num_layers:  int = NUM_LAYERS,
        latent_dim:  int = LATENT_DIM,
    ):
        super().__init__()
        self.input_size  = input_size
        self.hidden_size = hidden_size
        self.num_layers  = num_layers
        self.latent_dim  = latent_dim

        # Encoder
        self.encoder_lstm = nn.LSTM(
            input_size  = input_size,
            hidden_size = hidden_size,
            num_layers  = num_layers,
            batch_first = True,
            dropout     = 0.2 if num_layers > 1 else 0.0,
        )
        # Compress encoder hidden state to latent vector
        self.encoder_fc = nn.Linear(hidden_size, latent_dim)

        # Decoder
        self.decoder_lstm = nn.LSTM(
            input_size  = latent_dim,
            hidden_size = hidden_size,
            num_layers  = num_layers,
            batch_first = True,
            dropout     = 0.2 if num_layers > 1 else 0.0,
        )
        self.decoder_fc = nn.Linear(hidden_size, input_size)

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (batch, seq_len, input_size)
        Returns latent: (batch, latent_dim)
        """
        _, (h_n, _) = self.encoder_lstm(x)
        # h_n: (num_layers, batch, hidden_size) — take last layer
        latent = self.encoder_fc(h_n[-1])  # (batch, latent_dim)
        return latent

    def decode(self, latent: torch.Tensor, seq_len: int) -> torch.Tensor:
        """
        latent: (batch, latent_dim)
        Returns reconstruction: (batch, seq_len, input_size)
        """
        batch = latent.size(0)
        # Repeat latent vector across sequence dimension
        decoder_input = latent.unsqueeze(1).repeat(1, seq_len, 1)  # (batch, seq_len, latent_dim)
        out, _ = self.decoder_lstm(decoder_input)                   # (batch, seq_len, hidden_size)
        reconstruction = self.decoder_fc(out)                       # (batch, seq_len, input_size)
        return reconstruction

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        latent         = self.encode(x)
        reconstruction = self.decode(latent, x.size(1))
        return reconstruction, latent

    def reconstruction_error(self, x: torch.Tensor) -> torch.Tensor:
        """
        Returns MSE per sample: (batch,)
        Used directly at inference to get the anomaly score.
        """
        reconstruction, _ = self.forward(x)
        # MSE over all time steps and features
        error = ((x - reconstruction) ** 2).mean(dim=[1, 2])  # (batch,)
        return error