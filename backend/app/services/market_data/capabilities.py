"""Expiry-availability gating based on the active provider's real capabilities.

Platform rule: only enable an expiry when the selected market-data provider
supplies sufficiently granular realtime data. If reliable tick data is
unavailable, 15s and 30s expiries are disabled and a reason is surfaced to
the frontend so the UI can explain why.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.services.market_data.base import MarketDataProvider

ALL_EXPIRIES = [15, 30, 60, 120, 180, 300]


@dataclass
class ExpiryAvailability:
    seconds: int
    enabled: bool
    reason: str | None = None


def available_expiries(provider: MarketDataProvider) -> list[ExpiryAvailability]:
    result: list[ExpiryAvailability] = []
    for seconds in ALL_EXPIRIES:
        if seconds < provider.capabilities.min_reliable_expiry_seconds:
            result.append(
                ExpiryAvailability(
                    seconds=seconds,
                    enabled=False,
                    reason=(
                        f"{provider.name} does not supply sub-second realtime tick data, "
                        f"so expiries below {provider.capabilities.min_reliable_expiry_seconds}s "
                        "are disabled to avoid unreliable entries/results."
                    ),
                )
            )
        else:
            result.append(ExpiryAvailability(seconds=seconds, enabled=True, reason=None))
    return result
