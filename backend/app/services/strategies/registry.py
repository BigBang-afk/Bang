"""Maps strategy_code -> strategy implementation class."""

from app.services.strategies.base import BaseStrategy
from app.services.strategies.s1_ema_trend_pullback import EmaTrendPullbackStrategy
from app.services.strategies.s2_ema_crossover_momentum import EmaCrossoverMomentumStrategy
from app.services.strategies.s3_support_resistance_rejection import SupportResistanceRejectionStrategy
from app.services.strategies.s4_breakout_retest import BreakoutRetestStrategy
from app.services.strategies.s5_liquidity_sweep_reversal import LiquiditySweepReversalStrategy
from app.services.strategies.s6_rsi_divergence_reversal import RsiDivergenceReversalStrategy
from app.services.strategies.s7_bollinger_squeeze_breakout import BollingerSqueezeBreakoutStrategy
from app.services.strategies.s8_macd_momentum_continuation import MacdMomentumContinuationStrategy
from app.services.strategies.s9_candlestick_price_action import CandlestickPriceActionStrategy
from app.services.strategies.s10_multi_timeframe_confluence import MultiTimeframeConfluenceStrategy

STRATEGY_REGISTRY: dict[str, type[BaseStrategy]] = {
    "ema_trend_pullback": EmaTrendPullbackStrategy,
    "ema_crossover_momentum": EmaCrossoverMomentumStrategy,
    "support_resistance_rejection": SupportResistanceRejectionStrategy,
    "breakout_retest": BreakoutRetestStrategy,
    "liquidity_sweep_reversal": LiquiditySweepReversalStrategy,
    "rsi_divergence_reversal": RsiDivergenceReversalStrategy,
    "bollinger_squeeze_breakout": BollingerSqueezeBreakoutStrategy,
    "macd_momentum_continuation": MacdMomentumContinuationStrategy,
    "candlestick_price_action": CandlestickPriceActionStrategy,
    "multi_timeframe_confluence": MultiTimeframeConfluenceStrategy,
}


def build_strategy(strategy_code: str, configuration: dict) -> BaseStrategy:
    strategy_cls = STRATEGY_REGISTRY.get(strategy_code)
    if strategy_cls is None:
        raise ValueError(f"Unknown strategy code: {strategy_code}")
    return strategy_cls(configuration)
