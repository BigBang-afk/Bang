import "server-only";

import { generateAnalysis as defaultGenerateAnalysis } from "@/lib/ai/client";
import { buildAnalysisInputSnapshot } from "@/lib/ai/input-snapshot";
import { AIAnalysisError } from "@/lib/ai/schema";
import type { AIAnalysisOutput } from "@/lib/ai/schema";
import type { AnalysisInputSnapshot } from "@/lib/ai/types";
import type { Timeframe } from "@/lib/market-data/types";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow } from "@/types/database";

export interface RunAnalysisParams {
  userId: string;
  asset: MarketAssetRow;
  timeframe: Timeframe;
}

export interface RunAnalysisResult {
  analysisId: string;
  snapshot: AnalysisInputSnapshot;
  output: AIAnalysisOutput;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  cached: boolean;
  createdAt: string;
}

interface GenerateResult {
  output: AIAnalysisOutput;
  model: string;
  tokensUsed: number;
}

export interface PersistSuccessRecord {
  userId: string;
  asset: MarketAssetRow;
  timeframe: Timeframe;
  snapshot: AnalysisInputSnapshot;
  output: AIAnalysisOutput;
  model: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface PersistFailureRecord {
  userId: string;
  asset: MarketAssetRow;
  timeframe: Timeframe;
  errorMessage: string;
}

/**
 * Persistence and generation are both injectable so runAnalysis's actual
 * decision logic (cache hit/miss, error propagation, what gets logged when)
 * is unit-testable without a real Supabase client or network access — see
 * analyze.test.ts. The default implementations are the real Claude call and
 * the real ai_analyses insert.
 */
export interface RunAnalysisDeps {
  buildSnapshot: (asset: MarketAssetRow, timeframe: Timeframe) => Promise<AnalysisInputSnapshot>;
  generate: (snapshot: AnalysisInputSnapshot) => Promise<GenerateResult>;
  persistSuccess: (record: PersistSuccessRecord) => Promise<{ id: string; createdAt: string }>;
  persistFailure: (record: PersistFailureRecord) => Promise<void>;
}

async function persistSuccess(
  record: PersistSuccessRecord
): Promise<{ id: string; createdAt: string }> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("ai_analyses")
    .insert({
      user_id: record.userId,
      asset_id: record.asset.id,
      analysis_type: "market_summary",
      timeframe: record.timeframe,
      input_context: record.snapshot as unknown as Record<string, unknown>,
      output_json: record.output as unknown as Record<string, unknown>,
      model: record.model,
      tokens_used: record.tokensUsed,
      latency_ms: record.latencyMs,
      status: "completed",
    })
    .select("id, created_at")
    .single();

  if (error || !row) {
    // A logging failure shouldn't hide a successful analysis from the user
    // — but it does mean this request won't show up in the user's history
    // or admin usage monitoring, which matters, so it's surfaced loudly.
    console.error("[ai-analysis] failed to persist ai_analyses row", error);
    return { id: "unlogged", createdAt: new Date().toISOString() };
  }
  return { id: row.id, createdAt: row.created_at };
}

async function persistFailure(record: PersistFailureRecord): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_analyses").insert({
    user_id: record.userId,
    asset_id: record.asset.id,
    analysis_type: "market_summary",
    timeframe: record.timeframe,
    input_context: {},
    model: "n/a",
    status: "failed",
    error_message: record.errorMessage,
  });

  if (error) {
    console.error("[ai-analysis] failed to persist failed ai_analyses row", error);
  }
}

const defaultDeps: RunAnalysisDeps = {
  buildSnapshot: buildAnalysisInputSnapshot,
  generate: defaultGenerateAnalysis,
  persistSuccess,
  persistFailure,
};

interface CacheEntry {
  output: AIAnalysisOutput;
  model: string;
  snapshot: AnalysisInputSnapshot;
  expiresAt: number;
}

/**
 * In-memory, per-process cache — same documented limitation as
 * lib/rate-limit.ts (doesn't coordinate across serverless instances, fine
 * for now, revisit with a shared store before scaling out). Keyed by
 * symbol+timeframe, not by user: the analysis of BTCUSD on 1h doesn't
 * change per viewer, so a short TTL lets a burst of requests for the same
 * hot symbol reuse one Claude call instead of paying for each — real cost
 * control, not just a nice-to-have.
 */
const CACHE_TTL_MS = 3 * 60_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(assetId: string, timeframe: Timeframe): string {
  return `${assetId}:${timeframe}`;
}

/** Test-only: clears the module-level cache between test cases. */
export function _clearAnalysisCacheForTests(): void {
  cache.clear();
}

function errorMessageFor(err: unknown): string {
  if (err instanceof AIAnalysisError) return `[${err.code}] ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

/**
 * Orchestrates one AI market analysis: build the honest structured
 * snapshot, call Claude for a structured, schema-validated read on it, and
 * persist the full input/output/model for auditability — every request,
 * cache hit or not, gets its own ai_analyses row so per-user history and
 * admin usage monitoring both see everything. Deps are injectable so
 * tests can simulate a timeout, an API failure, or malformed output
 * without touching the network or a database.
 */
export async function runAnalysis(
  params: RunAnalysisParams,
  deps: RunAnalysisDeps = defaultDeps
): Promise<RunAnalysisResult> {
  const { userId, asset, timeframe } = params;
  const key = cacheKey(asset.id, timeframe);
  const cached = cache.get(key);
  const now = Date.now();
  const start = now;

  let snapshot: AnalysisInputSnapshot;
  let output: AIAnalysisOutput;
  let model: string;
  let tokensUsed: number;
  let wasCached = false;

  if (cached && cached.expiresAt > now) {
    snapshot = cached.snapshot;
    output = cached.output;
    model = cached.model;
    tokensUsed = 0;
    wasCached = true;
  } else {
    try {
      snapshot = await deps.buildSnapshot(asset, timeframe);
      const result = await deps.generate(snapshot);
      output = result.output;
      model = result.model;
      tokensUsed = result.tokensUsed;
    } catch (err) {
      await deps.persistFailure({ userId, asset, timeframe, errorMessage: errorMessageFor(err) });
      throw err;
    }
    cache.set(key, { output, model, snapshot, expiresAt: now + CACHE_TTL_MS });
  }

  const latencyMs = Date.now() - start;
  const { id: analysisId, createdAt } = await deps.persistSuccess({
    userId,
    asset,
    timeframe,
    snapshot,
    output,
    model,
    tokensUsed: wasCached ? 0 : tokensUsed,
    latencyMs,
  });

  return {
    analysisId,
    snapshot,
    output,
    model,
    tokensUsed: wasCached ? 0 : tokensUsed,
    latencyMs,
    cached: wasCached,
    createdAt,
  };
}
