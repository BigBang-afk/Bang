from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.logging import get_logger

router = APIRouter(prefix="/assistant", tags=["assistant"])
logger = get_logger(__name__)


class AssistantRequest(BaseModel):
    question: str
    context: dict = {}


class AssistantResponse(BaseModel):
    answer: str
    source: str  # "llm" | "rule_based_fallback"


SYSTEM_PROMPT = (
    "You are the trading-desk AI assistant for an institutional-style crypto terminal. "
    "You explain signals, market structure, and risk in clear, precise language. "
    "You never guarantee outcomes -- you present probabilities and evidence. "
    "Use the JSON context provided (signal details, indicator analysis, confidence breakdown) "
    "to ground every answer in the actual data. If the context doesn't contain the answer, say so."
)


def _rule_based_answer(question: str, context: dict) -> str:
    signal = context.get("signal")
    analysis = context.get("analysis")
    q = question.lower()

    if "why" in q and "signal" in q and signal:
        reasons = "; ".join(signal.get("reasons", [])) or "no independent conditions currently align"
        return (
            f"The {signal.get('direction')} signal on {signal.get('symbol')} was generated because: {reasons}. "
            f"Confidence is {signal.get('confidence_score')}%, which reflects the weighted sum of these "
            f"independent factors -- not a guarantee of outcome."
        )
    if "risk" in q and signal:
        rr = signal.get("risk_reward_ratio")
        return (
            f"Primary risks: price could invalidate the setup by trading through stop loss "
            f"{signal.get('stop_loss')} before reaching take-profit 1 ({signal.get('take_profit_1')}). "
            f"Risk:reward is {rr}:1. Suggested risk is {signal.get('suggested_risk_percent')}% of account equity "
            f"with leverage capped at {signal.get('suggested_leverage_max')}x given current volatility."
        )
    if "confidence" in q and signal:
        breakdown = signal.get("confidence_breakdown", {})
        parts = ", ".join(f"{k.replace('_', ' ')}: {v}" for k, v in breakdown.items())
        return f"Confidence of {signal.get('confidence_score')}% is built from: {parts}."
    if "structure" in q and analysis:
        structure = analysis.get("structure", {})
        return (
            f"Market structure: {structure.get('bos_choch', {}).get('event') or 'no recent BOS/CHoCH'}, "
            f"price is in a {structure.get('premium_discount', {}).get('zone')} zone, "
            f"with {len(structure.get('fair_value_gaps', []))} open fair value gap(s)."
        )
    if "summar" in q and analysis:
        trend = analysis.get("trend", {}).get("direction")
        vola = analysis.get("volatility", {}).get("regime", {}).get("regime")
        return f"Current market: {trend} trend, {vola} volatility regime, RSI {analysis.get('momentum', {}).get('rsi')}."

    return (
        "I can answer questions about why a signal was generated, what risks exist, confidence "
        "composition, market structure, and overall market conditions -- pass the relevant "
        "signal/analysis object as context for a grounded answer."
    )


@router.post("/ask", response_model=AssistantResponse)
async def ask(payload: AssistantRequest, _user: CurrentUser) -> AssistantResponse:
    if not settings.ANTHROPIC_API_KEY:
        return AssistantResponse(answer=_rule_based_answer(payload.question, payload.context), source="rule_based_fallback")

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=600,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Context: {payload.context}\n\nQuestion: {payload.question}",
                }
            ],
        )
        answer = "".join(block.text for block in message.content if hasattr(block, "text"))
        return AssistantResponse(answer=answer, source="llm")
    except Exception as exc:  # noqa: BLE001
        logger.warning("assistant_llm_failed", error=str(exc))
        return AssistantResponse(answer=_rule_based_answer(payload.question, payload.context), source="rule_based_fallback")
