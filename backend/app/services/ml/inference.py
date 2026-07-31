"""Loads an active, calibrated model and scores a single feature snapshot.

If loading or feature-name validation fails for any reason, callers must
fall back to rule-based confidence automatically - this module never
raises past `get_ml_probability`, it just returns None on any problem.
"""

from __future__ import annotations

import joblib

from app.core.logging import get_logger
from app.models.model_version import ModelVersion
from app.services.features.engine import FeatureSnapshot
from app.services.ml.features import FEATURE_NAMES, to_feature_vector

logger = get_logger(__name__)

_model_cache: dict[str, dict] = {}


def _load(file_path: str) -> dict | None:
    if file_path in _model_cache:
        return _model_cache[file_path]
    try:
        artifact = joblib.load(file_path)
    except Exception as exc:  # noqa: BLE001
        logger.error("ml_model_load_failed", file_path=file_path, error=str(exc))
        return None
    _model_cache[file_path] = artifact
    return artifact


def get_ml_probability(model_version: ModelVersion, features: FeatureSnapshot) -> float | None:
    if model_version.features_json and model_version.features_json != FEATURE_NAMES:
        logger.warning("ml_model_feature_mismatch", model_id=str(model_version.id))
        return None

    artifact = _load(model_version.file_path)
    if artifact is None:
        return None

    try:
        vector = [to_feature_vector(features)]
        probability = float(artifact["calibrated_model"].predict_proba(vector)[0, 1])
        return probability
    except Exception as exc:  # noqa: BLE001
        logger.error("ml_inference_failed", model_id=str(model_version.id), error=str(exc))
        return None
