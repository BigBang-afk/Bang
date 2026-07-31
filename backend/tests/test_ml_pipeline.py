"""ML pipeline: chronological (never random-shuffled) train/val/test split
and basic training-example construction correctness."""

from datetime import datetime, timedelta, timezone

import pandas as pd

from app.services.ml.pipeline import TrainingExample, chronological_split


def test_chronological_split_preserves_time_order_across_splits():
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    examples = [
        TrainingExample(timestamp=base + timedelta(minutes=i), features=[float(i)], label=i % 2) for i in range(100)
    ]
    # Shuffle input order to prove the split function sorts, not just slices.
    import random

    shuffled = examples[:]
    random.Random(0).shuffle(shuffled)

    train, val, test = chronological_split(shuffled)

    assert len(train) + len(val) + len(test) == len(examples)
    assert max(e.timestamp for e in train) <= min(e.timestamp for e in val)
    assert max(e.timestamp for e in val) <= min(e.timestamp for e in test)


def test_chronological_split_ratios_approximate_60_20_20():
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    examples = [
        TrainingExample(timestamp=base + timedelta(minutes=i), features=[float(i)], label=0) for i in range(100)
    ]
    train, val, test = chronological_split(examples, train_ratio=0.6, val_ratio=0.2)
    assert len(train) == 60
    assert len(val) == 20
    assert len(test) == 20


def test_feature_vector_matches_declared_feature_names_length():
    import numpy as np

    from app.services.features.engine import feature_engine
    from app.services.ml.features import FEATURE_NAMES, to_feature_vector

    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = []
    price = 1.08
    rng = np.random.default_rng(3)
    for i in range(250):
        price += rng.normal(0, 0.00005)
        rows.append(
            {
                "timestamp": now + timedelta(minutes=i),
                "open": price,
                "high": price + 0.0001,
                "low": price - 0.0001,
                "close": price,
                "volume": 10,
            }
        )
    df = pd.DataFrame(rows)
    features = feature_engine.compute(df)
    vector = to_feature_vector(features)
    assert len(vector) == len(FEATURE_NAMES)
    assert all(isinstance(v, float) for v in vector)
