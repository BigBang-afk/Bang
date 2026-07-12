"""Rule-based 'AI' analysis engine.

Not a black-box model — a transparent, explainable heuristics layer that
mines the journal for repeated mistakes, best/worst setups, timing edges
and psychology patterns. Institutional desks trust rules they can audit.
"""
from collections import Counter, defaultdict

from app.services.analytics import TradeStats, _f


class Insight:
    def __init__(self, category, severity, title, detail):
        self.category = category      # Mistakes | Setup | Timing | Psychology | Risk | Strategy
        self.severity = severity      # info | good | warning | critical
        self.title = title
        self.detail = detail


def analyze(trades, strategies_map, tags_by_trade, starting_balance=0.0, current_balance=0.0):
    stats = TradeStats(trades, starting_balance, current_balance)
    insights = []

    if stats.total_trades == 0:
        return [Insight("General", "info", "No data yet",
                         "Log a few trades to unlock AI performance analysis.")]

    insights += _mistake_patterns(stats)
    insights += _setup_analysis(stats, tags_by_trade)
    insights += _timing_analysis(stats)
    insights += _psychology_analysis(stats)
    insights += _risk_analysis(stats)
    insights += _strategy_comparison(stats, strategies_map)
    return insights


def _mistake_patterns(stats: TradeStats):
    out = []
    mistake_words = Counter()
    for r in stats.closed:
        text = (r.get("mistakes") or "").strip().lower()
        if text:
            for token in [t.strip() for t in text.replace(";", ",").split(",") if t.strip()]:
                mistake_words[token] += 1
    if mistake_words:
        top, count = mistake_words.most_common(1)[0]
        if count >= 2:
            out.append(Insight(
                "Mistakes", "warning", f'Repeated mistake: "{top}"',
                f'This mistake appears in {count} trades. Build a pre-trade checklist item to catch it.'
            ))
    plan_breaks = sum(1 for r in stats.closed if int(r.get("followed_plan") or 0) == 0)
    if stats.closed and plan_breaks / len(stats.closed) > 0.25:
        pct = plan_breaks / len(stats.closed) * 100
        out.append(Insight(
            "Mistakes", "critical", "Frequent plan deviation",
            f"You departed from your trading plan on {pct:.0f}% of trades. Deviation trades tend to "
            f"underperform — tighten entry criteria."
        ))
    return out


def _setup_analysis(stats: TradeStats, tags_by_trade):
    out = []
    tag_pl = defaultdict(float)
    tag_count = defaultdict(int)
    for r in stats.closed:
        for tag in tags_by_trade.get(r.get("id"), []):
            tag_pl[tag] += _f(r.get("profit_loss"))
            tag_count[tag] += 1
    if tag_pl:
        best_tag = max(tag_pl.items(), key=lambda kv: kv[1])
        worst_tag = min(tag_pl.items(), key=lambda kv: kv[1])
        if best_tag[1] > 0:
            out.append(Insight("Setup", "good", f'Best setup: "{best_tag[0]}"',
                                f"Net {best_tag[1]:.2f} across {tag_count[best_tag[0]]} trades — your highest edge."))
        if worst_tag[1] < 0:
            out.append(Insight("Setup", "warning", f'Worst setup: "{worst_tag[0]}"',
                                f"Net {worst_tag[1]:.2f} across {tag_count[worst_tag[0]]} trades — "
                                f"review criteria or avoid this setup."))
    return out


def _timing_analysis(stats: TradeStats):
    out = []
    session, s_pl = stats.most_profitable_session
    if session:
        out.append(Insight("Timing", "good", f"Best session: {session}",
                            f"Net {s_pl:.2f} — concentrate screen time here."))
    hour, h_pl = stats.most_profitable_hour
    if hour is not None:
        out.append(Insight("Timing", "info", f"Best hour: {hour:02d}:00",
                            f"Net {h_pl:.2f} historically in this hour."))
    dow = stats.by_day_of_week()
    if dow:
        best_day = max(dow.items(), key=lambda kv: kv[1])
        worst_day = min(dow.items(), key=lambda kv: kv[1])
        out.append(Insight("Timing", "info", f"Best weekday: {best_day[0]}",
                            f"Net {best_day[1]:.2f} on {best_day[0]}s."))
        if worst_day[1] < 0:
            out.append(Insight("Timing", "warning", f"Weakest weekday: {worst_day[0]}",
                                f"Net {worst_day[1]:.2f} — consider reduced size or no-trade rule."))
    return out


def _psychology_analysis(stats: TradeStats):
    out = []
    emo_pl = defaultdict(float)
    emo_count = defaultdict(int)
    for r in stats.closed:
        emo = r.get("emotion_before") or ""
        if emo:
            emo_pl[emo] += _f(r.get("profit_loss"))
            emo_count[emo] += 1
    if emo_pl:
        worst = min(emo_pl.items(), key=lambda kv: kv[1])
        if worst[1] < 0 and emo_count[worst[0]] >= 2:
            out.append(Insight("Psychology", "warning", f'Emotion risk: trading while "{worst[0]}"',
                                f"Net {worst[1]:.2f} across {emo_count[worst[0]]} trades entered in this state."))
    conf = [int(r.get("confidence_score") or 0) for r in stats.closed if r.get("confidence_score") is not None]
    if conf:
        low_conf_trades = [r for r in stats.closed if int(r.get("confidence_score") or 10) <= 4]
        if low_conf_trades:
            low_pl = sum(_f(r.get("profit_loss")) for r in low_conf_trades)
            out.append(Insight("Psychology", "info", "Low-confidence trades",
                                f"{len(low_conf_trades)} trades taken with confidence <= 4, net {low_pl:.2f}. "
                                f"Consider skipping low-conviction setups."))
    return out


def _risk_analysis(stats: TradeStats):
    out = []
    if stats.max_drawdown_percent > 15:
        out.append(Insight("Risk", "critical", "Elevated drawdown",
                            f"Max drawdown reached {stats.max_drawdown_percent:.1f}%. "
                            f"Reduce risk-per-trade until equity recovers."))
    if stats.profit_factor and stats.profit_factor < 1.2 and stats.total_trades >= 10:
        out.append(Insight("Risk", "warning", "Thin profit factor",
                            f"Profit factor is {stats.profit_factor:.2f}. Tighten stop discipline or "
                            f"filter for higher-quality setups."))
    if stats.current_losing_streak >= 3:
        out.append(Insight("Risk", "critical", "Active losing streak",
                            f"{stats.current_losing_streak} consecutive losses. Step back and reassess."))
    if stats.expectancy > 0:
        out.append(Insight("Risk", "good", "Positive expectancy",
                            f"Expectancy of {stats.expectancy:.2f} per trade — your edge is statistically real."))
    return out


def _strategy_comparison(stats: TradeStats, strategies_map):
    out = []
    breakdown = stats.strategy_breakdown(strategies_map)
    if len(breakdown) > 1:
        ranked = sorted(breakdown.items(), key=lambda kv: kv[1]["net"], reverse=True)
        best_name, best = ranked[0]
        worst_name, worst = ranked[-1]
        if best["trades"] >= 3:
            out.append(Insight("Strategy", "good", f'Highest-expectancy strategy: "{best_name}"',
                                f"Net {best['net']:.2f}, win rate {best['win_rate']:.1f}% "
                                f"over {best['trades']} trades."))
        if worst["trades"] >= 3 and worst["net"] < 0:
            out.append(Insight("Strategy", "warning", f'Underperforming strategy: "{worst_name}"',
                                f"Net {worst['net']:.2f}, win rate {worst['win_rate']:.1f}% "
                                f"over {worst['trades']} trades. Consider pausing this strategy."))
    return out
