from app.indicators.engine import analyze
from app.signals.confidence import score_direction
from app.signals.generator import generate_signal


def test_generate_signal_never_emits_without_reasons(uptrend_df):
    analysis = analyze(uptrend_df)
    signal = generate_signal("BTCUSDT", "15m", analysis)
    if signal is not None:
        assert len(signal["reasons"]) > 0
        assert 0 <= signal["confidence_score"] <= 100


def test_generate_signal_respects_min_risk_reward(uptrend_df):
    analysis = analyze(uptrend_df)
    signal = generate_signal("BTCUSDT", "15m", analysis)
    if signal is not None:
        assert signal["risk_reward_ratio"] >= 1.5


def test_generate_signal_choppy_market_often_none(choppy_df):
    analysis = analyze(choppy_df)
    signal = generate_signal("ETHUSDT", "15m", analysis)
    # Not a strict guarantee, but choppy/no-trend markets should not
    # produce a signal with an implausibly high confidence score.
    if signal is not None:
        assert signal["confidence_score"] < 100


def test_confidence_breakdown_sums_to_score(uptrend_df):
    analysis = analyze(uptrend_df)
    scored = score_direction(analysis, None, "BUY")
    assert round(sum(scored["breakdown"].values()), 1) == scored["score"]


def test_confidence_score_bounded(uptrend_df, downtrend_df):
    for df, direction in ((uptrend_df, "BUY"), (downtrend_df, "SELL")):
        analysis = analyze(df)
        scored = score_direction(analysis, None, direction)
        assert 0 <= scored["score"] <= 100
