import numpy as np
import pandas as pd
import pytest


def _make_ohlcv(n: int, drift: float, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    returns = rng.normal(loc=drift, scale=0.004, size=n)
    close = 100 * np.cumprod(1 + returns)
    open_ = np.roll(close, 1)
    open_[0] = close[0] * (1 - drift)
    high = np.maximum(open_, close) * (1 + np.abs(rng.normal(0, 0.002, n)))
    low = np.minimum(open_, close) * (1 - np.abs(rng.normal(0, 0.002, n)))
    volume = rng.uniform(100, 1000, n)
    open_time = (np.arange(n) * 60_000 + 1_700_000_000_000).astype(np.int64)
    close_time = open_time + 59_999

    return pd.DataFrame(
        {
            "open_time": open_time,
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
            "close_time": close_time,
        }
    )


@pytest.fixture
def uptrend_df() -> pd.DataFrame:
    return _make_ohlcv(300, drift=0.0025, seed=1)


@pytest.fixture
def downtrend_df() -> pd.DataFrame:
    return _make_ohlcv(300, drift=-0.0025, seed=2)


@pytest.fixture
def choppy_df() -> pd.DataFrame:
    return _make_ohlcv(300, drift=0.0, seed=3)
