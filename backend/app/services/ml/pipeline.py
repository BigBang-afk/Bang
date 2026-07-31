"""XGBoost training pipeline for ranking/filtering strategy signals.

Design constraints from the platform spec, enforced directly in this file:
* Chronological train/validation/test split - never a random full-dataset
  shuffle, so the model is never evaluated on data that precedes its
  training window.
* No data leakage: every training example's features are computed from a
  strictly causal window (the same feature engine used live/in backtests).
* Probability calibration on a held-out validation split before the model
  ever gets to influence a live signal.
* The model only ranks/filters signals a strategy already produced - it
  never invents a signal on its own.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score
from xgboost import XGBClassifier

from app.models.enums import SignalDirection
from app.services.features.engine import feature_engine
from app.services.market_condition.engine import classify, is_strategy_compatible
from app.services.ml.features import FEATURE_NAMES, to_feature_vector
from app.services.strategies.base import BaseStrategy

MIN_HISTORY = 210


@dataclass
class TrainingExample:
    timestamp: pd.Timestamp
    features: list[float]
    label: int  # 1 = WIN, 0 = LOSS (draws are excluded from training)


@dataclass
class TrainedModelArtifact:
    file_path: str
    metrics: dict
    feature_names: list[str]
    probability_threshold: float
    training_examples: int


def build_training_examples(
    candles: pd.DataFrame, strategy: BaseStrategy, strategy_code: str, expiry_seconds: int, timeframe_seconds: int
) -> list[TrainingExample]:
    candles = candles.reset_index(drop=True)
    examples: list[TrainingExample] = []
    expiry_bars = max(1, round(expiry_seconds / timeframe_seconds))

    for i in range(MIN_HISTORY, len(candles) - expiry_bars):
        window = candles.iloc[: i + 1]
        features = feature_engine.compute(window)
        if features is None:
            continue
        market_condition = classify(features)
        compatible, _ = is_strategy_compatible(strategy_code, market_condition)
        if not compatible:
            continue
        evaluation = strategy.evaluate(window, features)
        if evaluation.direction == SignalDirection.NO_TRADE:
            continue

        entry_price = float(candles.iloc[i]["close"])
        expiry_price = float(candles.iloc[i + expiry_bars]["close"])
        if expiry_price == entry_price:
            continue  # draws excluded from binary training labels
        won = (evaluation.direction == SignalDirection.CALL and expiry_price > entry_price) or (
            evaluation.direction == SignalDirection.PUT and expiry_price < entry_price
        )
        examples.append(
            TrainingExample(
                timestamp=window.iloc[-1]["timestamp"], features=to_feature_vector(features), label=int(won)
            )
        )
    return examples


def chronological_split(
    examples: list[TrainingExample], train_ratio: float = 0.6, val_ratio: float = 0.2
) -> tuple[list[TrainingExample], list[TrainingExample], list[TrainingExample]]:
    examples = sorted(examples, key=lambda e: e.timestamp)
    n = len(examples)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    return examples[:train_end], examples[train_end:val_end], examples[val_end:]


def train_and_calibrate(examples: list[TrainingExample], model_dir: Path, model_name: str) -> TrainedModelArtifact:
    train, val, test = chronological_split(examples)
    if min(len(train), len(val), len(test)) < 20:
        raise ValueError(
            f"Not enough labeled examples ({len(examples)}) for a reliable chronological "
            "train/validation/test split (need at least 20 in each split)."
        )

    X_train = np.array([e.features for e in train])
    y_train = np.array([e.label for e in train])
    X_val = np.array([e.features for e in val])
    y_val = np.array([e.label for e in val])
    X_test = np.array([e.features for e in test])
    y_test = np.array([e.label for e in test])

    base_model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        n_jobs=2,
    )
    base_model.fit(X_train, y_train)

    calibrated = CalibratedClassifierCV(base_model, method="sigmoid", cv="prefit")
    calibrated.fit(X_val, y_val)

    test_probs = calibrated.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= 0.5).astype(int)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, test_preds)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, test_probs)), 4) if len(set(y_test)) > 1 else None,
        "log_loss": round(float(log_loss(y_test, test_probs, labels=[0, 1])), 4),
        "brier_score": round(float(brier_score_loss(y_test, test_probs)), 4),
        "train_size": len(train),
        "validation_size": len(val),
        "test_size": len(test),
        "positive_rate_test": round(float(y_test.mean()), 4),
    }

    model_dir.mkdir(parents=True, exist_ok=True)
    file_path = model_dir / f"{model_name}.joblib"
    joblib.dump({"base_model": base_model, "calibrated_model": calibrated, "feature_names": FEATURE_NAMES}, file_path)

    return TrainedModelArtifact(
        file_path=str(file_path),
        metrics=metrics,
        feature_names=FEATURE_NAMES,
        probability_threshold=0.55,
        training_examples=len(examples),
    )
