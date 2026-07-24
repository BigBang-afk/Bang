"""Order book / order flow analysis from raw depth snapshots and recent trade prints.

Inputs are the shapes returned by MexcClient.get_order_book() / get_recent_trades():
    order_book = {"bids": [[price, qty], ...], "asks": [[price, qty], ...]}
    trades = [{"price": float, "qty": float, "side": "buy"|"sell", "time": ...}, ...]
"""
from __future__ import annotations


def bid_ask_imbalance(order_book: dict, depth: int = 20) -> dict:
    bids = order_book.get("bids", [])[:depth]
    asks = order_book.get("asks", [])[:depth]

    bid_volume = sum(float(b[1]) for b in bids)
    ask_volume = sum(float(a[1]) for a in asks)
    total = bid_volume + ask_volume

    imbalance = ((bid_volume - ask_volume) / total * 100) if total else 0.0
    return {
        "bid_volume": bid_volume,
        "ask_volume": ask_volume,
        "imbalance_pct": imbalance,
        "bias": "buyers" if imbalance > 5 else "sellers" if imbalance < -5 else "balanced",
    }


def detect_liquidity_walls(order_book: dict, depth: int = 50, wall_multiplier: float = 4.0) -> dict:
    """A "wall" is a resting order whose size is `wall_multiplier`x the average size at that depth."""
    bids = order_book.get("bids", [])[:depth]
    asks = order_book.get("asks", [])[:depth]

    def find_walls(levels):
        if not levels:
            return []
        avg_size = sum(float(lvl[1]) for lvl in levels) / len(levels)
        threshold = avg_size * wall_multiplier
        return [{"price": float(lvl[0]), "quantity": float(lvl[1])} for lvl in levels if float(lvl[1]) >= threshold]

    return {"buy_walls": find_walls(bids), "sell_walls": find_walls(asks)}


def cumulative_delta(trades: list[dict]) -> float:
    """Net aggressive buy volume minus aggressive sell volume across the supplied trade prints."""
    delta = 0.0
    for t in trades:
        qty = float(t.get("qty", 0))
        if t.get("side") == "buy":
            delta += qty
        elif t.get("side") == "sell":
            delta -= qty
    return delta


def detect_absorption(trades: list[dict], price_move_threshold_pct: float = 0.1) -> dict:
    """Absorption: high traded volume with little resulting price movement, suggesting a large
    passive order is soaking up aggression at a level."""
    if len(trades) < 2:
        return {"absorption_detected": False}

    prices = [float(t["price"]) for t in trades]
    volume = sum(float(t.get("qty", 0)) for t in trades)
    price_move_pct = abs(prices[-1] - prices[0]) / prices[0] * 100 if prices[0] else 0

    delta = cumulative_delta(trades)
    high_volume = volume > 0 and price_move_pct < price_move_threshold_pct

    return {
        "absorption_detected": high_volume,
        "volume": volume,
        "price_move_pct": price_move_pct,
        "delta": delta,
        "side_absorbed": "sellers" if delta > 0 and high_volume else "buyers" if delta < 0 and high_volume else None,
    }


def detect_exhaustion(trades: list[dict], lookback_split: int = 2) -> dict:
    """Exhaustion: aggressive volume increasing while price fails to make further progress in the
    second half of the sample vs the first half — a proxy for momentum running out."""
    if len(trades) < lookback_split * 2:
        return {"exhaustion_detected": False}

    mid = len(trades) // 2
    first_half, second_half = trades[:mid], trades[mid:]

    first_delta = cumulative_delta(first_half)
    second_delta = cumulative_delta(second_half)

    first_move = abs(float(first_half[-1]["price"]) - float(first_half[0]["price"]))
    second_move = abs(float(second_half[-1]["price"]) - float(second_half[0]["price"]))

    exhausted = abs(second_delta) > abs(first_delta) * 1.2 and second_move < first_move * 0.6

    return {"exhaustion_detected": exhausted, "first_half_delta": first_delta, "second_half_delta": second_delta}


def detect_spoofing_heuristic(order_book_snapshots: list[dict], depth: int = 10) -> dict:
    """Heuristic-only spoofing flag: large resting orders that repeatedly appear and vanish
    across consecutive snapshots without being filled. Requires >= 3 snapshots to evaluate."""
    if len(order_book_snapshots) < 3:
        return {"spoofing_suspected": False, "reason": "insufficient_snapshots"}

    disappearances = 0
    for i in range(1, len(order_book_snapshots)):
        prev_walls = detect_liquidity_walls(order_book_snapshots[i - 1], depth=depth)
        curr_walls = detect_liquidity_walls(order_book_snapshots[i], depth=depth)

        prev_prices = {w["price"] for w in prev_walls["buy_walls"] + prev_walls["sell_walls"]}
        curr_prices = {w["price"] for w in curr_walls["buy_walls"] + curr_walls["sell_walls"]}

        if prev_prices - curr_prices:
            disappearances += 1

    ratio = disappearances / (len(order_book_snapshots) - 1)
    return {"spoofing_suspected": ratio > 0.6, "disappearance_ratio": ratio}
