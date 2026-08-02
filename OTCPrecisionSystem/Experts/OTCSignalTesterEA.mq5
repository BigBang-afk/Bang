//+------------------------------------------------------------------+
//|                                        OTCSignalTesterEA.mq5     |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Backtesting / validation EA. Uses the EXACT SAME CSignalEngine   |
//| module as OTCPrecisionIndicator.mq5, so historical results       |
//| reflect the same non-repainting logic that runs live. This EA    |
//| does not place any trades - it only evaluates, settles and       |
//| records CALL/PUT signals for statistical validation.             |
//|                                                                    |
//| Do not judge a parameter set solely because its in-sample result |
//| exceeds 85%. Always inspect the separately reported out-of-      |
//| sample / forward-test figures before drawing conclusions.        |
//+------------------------------------------------------------------+
#property copyright "OTC Precision Signal System"
#property link      ""
#property version   "1.00"
#property strict

#include <OTCPrecision/MarketRegime.mqh>
#include <OTCPrecision/SignalEngine.mqh>
#include <OTCPrecision/Statistics.mqh>
#include <OTCPrecision/Dashboard.mqh>

//====================================================================
// INPUTS (mirrors OTCPrecisionIndicator.mq5 so both share identical
// signal behaviour when configured with the same values / preset).
//====================================================================

input string   Inp_General                    = "==== General ====";
input int      InpMinHistoryBars               = 250;
input bool     InpDebugLogging                  = false;
input string   InpAdditionalSymbols             = ""; // Comma-separated extra symbols for portfolio testing

input string   Inp_Mode                        = "==== Signal Mode ====";
input ENUM_ENGINE_MODE InpSignalMode            = ENGINE_MODE_CONSERVATIVE;

input string   Inp_Expiry                      = "==== Expiry ====";
enum ENUM_EXPIRY_MODE
  {
   EXPIRY_1_CANDLE = 1,
   EXPIRY_2_CANDLES = 2,
   EXPIRY_3_CANDLES = 3,
   EXPIRY_5_CANDLES = 5,
   EXPIRY_CUSTOM_SECONDS = 0
  };
input ENUM_EXPIRY_MODE InpExpiryMode            = EXPIRY_1_CANDLE;
input int      InpCustomExpirySeconds           = 60;

input string   Inp_Trend                       = "==== Trend ====";
input int      InpEmaFastPeriod                 = 20;
input int      InpEmaMidPeriod                  = 50;
input int      InpEmaSlowPeriod                 = 200;
input int      InpEmaSlopeLookback              = 5;

input string   Inp_Momentum                    = "==== Momentum ====";
input int      InpRsiPeriod                     = 14;
input int      InpStochK                        = 5;
input int      InpStochD                        = 3;
input int      InpStochSlowing                  = 3;
input int      InpMacdFast                      = 12;
input int      InpMacdSlow                      = 26;
input int      InpMacdSignal                    = 9;
input int      InpRocPeriod                     = 10;

input string   Inp_Structure                   = "==== Structure ====";
input int      InpSwingLookback                 = 3;
input int      InpStructureSearchBars           = 80;

input string   Inp_SR                          = "==== Support/Resistance ====";
input int      InpSRSwingLookback               = 20;
input double   InpSRAtrDistanceMult             = 0.5;
input bool     InpUsePrevDayLevels              = true;
input bool     InpUsePrevSessionLevels          = true;
input bool     InpUseRoundLevels                = true;
input double   InpRoundLevelStep                = 0.0010;

input string   Inp_Liquidity                   = "==== Liquidity ====";
input int      InpLiquidityLookback             = 15;
input double   InpLiquiditySweepAtrMult         = 0.25;

input string   Inp_Volatility                  = "==== Volatility ====";
input int      InpAtrPeriod                     = 14;
input int      InpBBPeriod                      = 20;
input double   InpBBDeviation                   = 2.0;
input double   InpMinBodyAtrRatio               = 0.15;
input double   InpMaxAtrSpikeRatio              = 2.5;
input int      InpVolPercentileLookback         = 100;
input double   InpHighVolPercentile             = 90.0;
input double   InpLowVolPercentile              = 10.0;
input int      InpAdxPeriod                     = 14;
input double   InpAdxTrendThreshold             = 22.0;

input string   Inp_MTF                         = "==== Multi-Timeframe ====";
input ENUM_TIMEFRAMES InpConfirmTimeframe       = PERIOD_M5;
input ENUM_TIMEFRAMES InpTrendTimeframe         = PERIOD_M15;

input string   Inp_Confidence                  = "==== Confidence Scoring ====";
input double   InpMinConfidenceCustom           = 85.0;
input int      InpMinModulesAgreeingCustom      = 6;
input bool     InpRequireHtfCustom              = true;
input bool     InpRequireStructureCustom        = true;
input bool     InpRequirePriceActionCustom      = true;
input bool     InpBlockNearSrCustom             = true;
input bool     InpBlockAbnormalVolCustom        = true;
input int      InpMinCooldownCustom             = 3;
input double   InpWeightStructure               = 15.0;
input double   InpWeightTrend                   = 20.0;
input double   InpWeightMomentum                = 15.0;
input double   InpWeightPriceAction             = 15.0;
input double   InpWeightSR                      = 10.0;
input double   InpWeightLiquidity               = 10.0;
input double   InpWeightMTF                     = 15.0;

input string   Inp_NoTrade                     = "==== No-Trade Filters ====";
input double   InpMaxSpreadPoints               = 25.0;
input double   InpMaxDataGapMultiplier          = 3.0;

input string   Inp_Stats                       = "==== Statistics ====";
input int      InpMinSampleSize                 = 200;
input double   InpSimPayoutPercent              = 85.0;
input bool     InpExportCSV                     = true;
input string   InpCSVFileName                   = "OTCSignalTester_Signals.csv";
input string   InpSummaryReportFileName         = "OTCSignalTester_Summary.txt";

input string   Inp_Dashboard                   = "==== Dashboard ====";
input bool     InpShowDashboardInVisualMode     = true;

//--- Validation process
input string   Inp_Validation                  = "==== Validation ====";
input datetime InpTrainingStart                 = 0;          // Training window start (0 = test start)
input datetime InpTrainingEnd                   = 0;          // Training window end (0 = forward start)
input datetime InpForwardStart                  = 0;          // Forward-test window start (0 = disabled)
input datetime InpForwardEnd                    = 0;          // Forward-test window end (0 = test end)
input int      InpMinRequiredTrades             = 1000;       // Minimum settled signals across full portfolio
input int      InpMinMarketDays                 = 250;        // Minimum distinct market days (~12 months)
input int      InpMinSymbols                    = 1;          // Minimum symbols required
input double   InpMaxAcceptableDrawdown         = 30.0;       // Max acceptable simulated drawdown (stake units)
input int      InpMaxAcceptableConsecLosses     = 8;          // Max acceptable consecutive losses

//--- OnTester scoring weights
input string   Inp_Scoring                     = "==== OnTester Scoring Weights ====";
input double   InpWeightExpectedValue           = 40.0;
input double   InpWeightProfitFactor            = 20.0;
input double   InpWeightSampleSize              = 15.0;
input double   InpWeightForwardStability        = 15.0;
input double   InpWeightDrawdownPenalty         = 20.0;
input double   InpWeightConsecLossPenalty       = 15.0;

//====================================================================
// GLOBALS
//====================================================================

struct SPendingSignal
  {
   datetime signal_time;
   datetime expiry_time;
   int      target_bar_index;
   string   symbol;
   ENUM_TIMEFRAMES timeframe;
   int      direction;
   double   entry_price;
   double   confidence;
   int      modules_agreeing;
   ENUM_MARKET_REGIME regime;
   bool     settled;
  };

struct SSymbolContext
  {
   string          symbol;
   CSignalEngine   engine;
   SPendingSignal  pending[];
   datetime        last_bar_time;
   int             bar_counter;
  };

SSymbolContext     g_ctx[];
CSignalStatistics  g_stats_all;
CSignalStatistics  g_stats_insample;
CSignalStatistics  g_stats_forward;
CDashboard         g_dashboard;

int      g_csv_handle = INVALID_HANDLE;
string   g_market_days[];

//+------------------------------------------------------------------+
void BuildSettings(SEngineSettings &cfg)
  {
   cfg.mode = InpSignalMode;
   cfg.ema_fast_period = InpEmaFastPeriod; cfg.ema_mid_period = InpEmaMidPeriod;
   cfg.ema_slow_period = InpEmaSlowPeriod; cfg.ema_slope_lookback = InpEmaSlopeLookback;

   cfg.rsi_period = InpRsiPeriod; cfg.stoch_k_period = InpStochK; cfg.stoch_d_period = InpStochD;
   cfg.stoch_slowing = InpStochSlowing; cfg.macd_fast_period = InpMacdFast; cfg.macd_slow_period = InpMacdSlow;
   cfg.macd_signal_period = InpMacdSignal; cfg.roc_period = InpRocPeriod;

   cfg.swing_lookback = InpSwingLookback; cfg.structure_search_bars = InpStructureSearchBars;

   cfg.atr_period = InpAtrPeriod; cfg.bb_period = InpBBPeriod; cfg.bb_deviation = InpBBDeviation;
   cfg.min_body_atr_ratio = InpMinBodyAtrRatio; cfg.max_atr_spike_ratio = InpMaxAtrSpikeRatio;
   cfg.volatility_percentile_lookback = InpVolPercentileLookback;
   cfg.high_vol_percentile = InpHighVolPercentile; cfg.low_vol_percentile = InpLowVolPercentile;
   cfg.adx_period = InpAdxPeriod; cfg.adx_trend_threshold = InpAdxTrendThreshold;

   cfg.sr_swing_lookback = InpSRSwingLookback; cfg.sr_atr_distance_mult = InpSRAtrDistanceMult;
   cfg.use_prev_day_levels = InpUsePrevDayLevels; cfg.use_prev_session_levels = InpUsePrevSessionLevels;
   cfg.use_round_levels = InpUseRoundLevels; cfg.round_level_step = InpRoundLevelStep;

   cfg.liquidity_lookback = InpLiquidityLookback; cfg.liquidity_sweep_atr_mult = InpLiquiditySweepAtrMult;

   cfg.confirm_timeframe = InpConfirmTimeframe; cfg.trend_timeframe = InpTrendTimeframe;

   cfg.weight_structure = InpWeightStructure; cfg.weight_trend = InpWeightTrend;
   cfg.weight_momentum = InpWeightMomentum; cfg.weight_price_action = InpWeightPriceAction;
   cfg.weight_sr = InpWeightSR; cfg.weight_liquidity = InpWeightLiquidity; cfg.weight_mtf = InpWeightMTF;

   cfg.max_spread_points = InpMaxSpreadPoints; cfg.max_data_gap_multiplier = InpMaxDataGapMultiplier;
   cfg.min_history_bars = InpMinHistoryBars;

   switch(InpSignalMode)
     {
      case ENGINE_MODE_CONSERVATIVE:
         cfg.min_confidence = 85.0; cfg.min_modules_agreeing = 6;
         cfg.require_htf_confirmation = true; cfg.require_structure_confirmation = true;
         cfg.require_price_action_confirmation = true; cfg.block_near_sr = true;
         cfg.block_abnormal_volatility = true; cfg.min_cooldown_candles = 3;
         break;
      case ENGINE_MODE_BALANCED:
         cfg.min_confidence = 75.0; cfg.min_modules_agreeing = 5;
         cfg.require_htf_confirmation = true; cfg.require_structure_confirmation = true;
         cfg.require_price_action_confirmation = false; cfg.block_near_sr = true;
         cfg.block_abnormal_volatility = true; cfg.min_cooldown_candles = 2;
         break;
      case ENGINE_MODE_AGGRESSIVE:
         cfg.min_confidence = 65.0; cfg.min_modules_agreeing = 4;
         cfg.require_htf_confirmation = false; cfg.require_structure_confirmation = false;
         cfg.require_price_action_confirmation = false; cfg.block_near_sr = false;
         cfg.block_abnormal_volatility = false; cfg.min_cooldown_candles = 1;
         break;
      default:
         cfg.min_confidence = InpMinConfidenceCustom; cfg.min_modules_agreeing = InpMinModulesAgreeingCustom;
         cfg.require_htf_confirmation = InpRequireHtfCustom; cfg.require_structure_confirmation = InpRequireStructureCustom;
         cfg.require_price_action_confirmation = InpRequirePriceActionCustom; cfg.block_near_sr = InpBlockNearSrCustom;
         cfg.block_abnormal_volatility = InpBlockAbnormalVolCustom; cfg.min_cooldown_candles = InpMinCooldownCustom;
         break;
     }
  }

//+------------------------------------------------------------------+
int ExpirySecondsFor(const ENUM_TIMEFRAMES tf)
  {
   if(InpExpiryMode == EXPIRY_CUSTOM_SECONDS)
      return(MathMax(1, InpCustomExpirySeconds));
   return((int)InpExpiryMode * (int)PeriodSeconds(tf));
  }

//+------------------------------------------------------------------+
int ExpiryCandlesCount(void)
  {
   if(InpExpiryMode == EXPIRY_CUSTOM_SECONDS)
      return(0);
   return((int)InpExpiryMode);
  }

//+------------------------------------------------------------------+
void RegisterMarketDay(const datetime t)
  {
   MqlDateTime dt;
   TimeToStruct(t, dt);
   string key = StringFormat("%04d.%02d.%02d", dt.year, dt.mon, dt.day);
   int n = ArraySize(g_market_days);
   for(int i = 0; i < n; i++)
      if(g_market_days[i] == key)
         return;
   ArrayResize(g_market_days, n + 1);
   g_market_days[n] = key;
  }

//+------------------------------------------------------------------+
int OnInit(void)
  {
   string symbols[];
   int extra = 0;
   if(StringLen(InpAdditionalSymbols) > 0)
      extra = StringSplit(InpAdditionalSymbols, ',', symbols);

   int total_symbols = 1 + extra;
   ArrayResize(g_ctx, total_symbols);

   SEngineSettings cfg;
   BuildSettings(cfg);

   g_ctx[0].symbol = _Symbol;
   g_ctx[0].last_bar_time = 0;
   g_ctx[0].bar_counter = 0;
   if(!g_ctx[0].engine.Init(_Symbol, (ENUM_TIMEFRAMES)Period(), cfg))
     {
      Print("OTCSignalTesterEA: failed to init engine for primary symbol.");
      return(INIT_FAILED);
     }

   for(int i = 0; i < extra; i++)
     {
      string sym = symbols[i];
      StringTrimLeft(sym); StringTrimRight(sym);
      if(StringLen(sym) == 0)
         continue;
      g_ctx[i + 1].symbol = sym;
      g_ctx[i + 1].last_bar_time = 0;
      g_ctx[i + 1].bar_counter = 0;
      if(!g_ctx[i + 1].engine.Init(sym, (ENUM_TIMEFRAMES)Period(), cfg))
         PrintFormat("OTCSignalTesterEA: WARNING - failed to init engine for additional symbol %s", sym);
     }

   g_stats_all.Init(InpMinSampleSize, InpSimPayoutPercent);
   g_stats_insample.Init(InpMinSampleSize, InpSimPayoutPercent);
   g_stats_forward.Init(InpMinSampleSize, InpSimPayoutPercent);

   if(InpExportCSV)
     {
      g_csv_handle = FileOpen(InpCSVFileName, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
      if(g_csv_handle == INVALID_HANDLE)
         PrintFormat("OTCSignalTesterEA: failed to open CSV export file %s (err=%d)", InpCSVFileName, GetLastError());
      else
         CSignalStatistics::WriteCSVHeader(g_csv_handle);
     }

   if(InpShowDashboardInVisualMode && MQLInfoInteger(MQL_VISUAL_MODE))
      g_dashboard.Init(0, "OTCP_TESTER_DASH_", 14, 20, 8);

   ArrayResize(g_market_days, 0);

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   for(int i = 0; i < ArraySize(g_ctx); i++)
      g_ctx[i].engine.Deinit();

   if(g_csv_handle != INVALID_HANDLE)
     {
      FileClose(g_csv_handle);
      g_csv_handle = INVALID_HANDLE;
     }

   if(InpShowDashboardInVisualMode && MQLInfoInteger(MQL_VISUAL_MODE))
      g_dashboard.Deinit();

   g_stats_all.ExportSummaryReport(InpSummaryReportFileName);
   PrintFormat("OTCSignalTesterEA: run complete. Total settled=%d, win rate=%s",
               g_stats_all.TotalSignals(), g_stats_all.WinRateDisplayText());
  }

//+------------------------------------------------------------------+
void SettlePendingFor(SSymbolContext &ctx, const int bar_index, const datetime bar_time, const double bar_close)
  {
   for(int i = 0; i < ArraySize(ctx.pending); i++)
     {
      if(ctx.pending[i].settled)
         continue;

      bool due = false;
      if(ctx.pending[i].target_bar_index >= 0)
         due = (bar_index >= ctx.pending[i].target_bar_index);
      else
         due = (bar_time >= ctx.pending[i].expiry_time);

      if(!due)
         continue;

      int result = CSignalEngine::EvaluateOutcome(ctx.pending[i].direction, ctx.pending[i].entry_price, bar_close);

      SSignalRecord rec;
      rec.signal_time    = ctx.pending[i].signal_time;
      rec.expiry_time     = bar_time;
      rec.symbol          = ctx.pending[i].symbol;
      rec.timeframe       = ctx.pending[i].timeframe;
      rec.direction       = ctx.pending[i].direction;
      rec.entry_price     = ctx.pending[i].entry_price;
      rec.exit_price      = bar_close;
      rec.result           = result;
      rec.expiry_seconds   = ExpirySecondsFor(ctx.pending[i].timeframe);
      rec.regime           = ctx.pending[i].regime;
      rec.confidence       = ctx.pending[i].confidence;
      rec.modules_agreeing = ctx.pending[i].modules_agreeing;

      g_stats_all.AddSettledSignal(rec);

      bool in_forward = (InpForwardStart > 0 && rec.signal_time >= InpForwardStart &&
                          (InpForwardEnd == 0 || rec.signal_time <= InpForwardEnd));
      bool in_training = (!in_forward) &&
                          (InpTrainingStart == 0 || rec.signal_time >= InpTrainingStart) &&
                          (InpTrainingEnd == 0 || rec.signal_time <= InpTrainingEnd);

      if(in_forward)
         g_stats_forward.AddSettledSignal(rec);
      else if(in_training)
         g_stats_insample.AddSettledSignal(rec);

      RegisterMarketDay(rec.signal_time);

      if(InpExportCSV && g_csv_handle != INVALID_HANDLE)
         CSignalStatistics::WriteCSVRow(g_csv_handle, rec);

      ctx.pending[i].settled = true;
     }
  }

//+------------------------------------------------------------------+
void QueuePending(SSymbolContext &ctx, const SEngineOutput &sig, const int bar_index)
  {
   int n = ArraySize(ctx.pending);
   ArrayResize(ctx.pending, n + 1);
   ctx.pending[n].signal_time      = sig.bar_time;
   ctx.pending[n].symbol            = ctx.symbol;
   ctx.pending[n].timeframe         = (ENUM_TIMEFRAMES)Period();
   ctx.pending[n].direction         = sig.direction;
   ctx.pending[n].entry_price       = sig.entry_price;
   ctx.pending[n].confidence        = sig.confidence;
   ctx.pending[n].modules_agreeing  = sig.modules_agreeing;
   ctx.pending[n].regime            = sig.regime;
   ctx.pending[n].settled           = false;

   int candles = ExpiryCandlesCount();
   if(candles > 0)
     {
      ctx.pending[n].target_bar_index = bar_index + candles;
      ctx.pending[n].expiry_time       = sig.bar_time + (datetime)(candles * PeriodSeconds(PERIOD_CURRENT));
     }
   else
     {
      ctx.pending[n].target_bar_index = -1;
      ctx.pending[n].expiry_time       = sig.bar_time + (datetime)ExpirySecondsFor((ENUM_TIMEFRAMES)Period());
     }
  }

//+------------------------------------------------------------------+
void ProcessSymbol(SSymbolContext &ctx)
  {
   datetime cur_time[];
   ArraySetAsSeries(cur_time, true);
   if(CopyTime(ctx.symbol, (ENUM_TIMEFRAMES)Period(), 0, 3, cur_time) < 3)
      return;

   if(cur_time[1] == ctx.last_bar_time)
      return; // no new closed bar yet for this symbol

   ctx.last_bar_time = cur_time[1];
   ctx.bar_counter++;

   //--- absolute bar index for this symbol expressed as "bars ago from current, negated"
   int bar_index = ctx.bar_counter;

   SEngineOutput sig = ctx.engine.Evaluate(1);
   if(!sig.data_ready)
      return;

   double close_price[];
   ArraySetAsSeries(close_price, true);
   if(CopyClose(ctx.symbol, (ENUM_TIMEFRAMES)Period(), 1, 1, close_price) < 1)
      return;

   if(sig.is_final_signal)
     {
      ctx.engine.RegisterConfirmedSignal(sig.bar_time);
      QueuePending(ctx, sig, bar_index);
      if(InpDebugLogging)
         PrintFormat("OTCSignalTesterEA: %s %s signal at %s price=%s conf=%.1f",
                     ctx.symbol, sig.direction == OTC_DIR_CALL ? "CALL" : "PUT",
                     TimeToString(sig.bar_time), DoubleToString(sig.entry_price, _Digits), sig.confidence);
     }

   ctx.engine.MarkBarProcessed(sig.bar_time);
   SettlePendingFor(ctx, bar_index, cur_time[1], close_price[0]);
  }

//+------------------------------------------------------------------+
void OnTick(void)
  {
   for(int i = 0; i < ArraySize(g_ctx); i++)
      ProcessSymbol(g_ctx[i]);

   if(InpShowDashboardInVisualMode && MQLInfoInteger(MQL_VISUAL_MODE))
     {
      SDashboardData d;
      d.symbol              = _Symbol;
      d.timeframe_label       = EnumToString((ENUM_TIMEFRAMES)Period());
      d.expiry_label          = (InpExpiryMode == EXPIRY_CUSTOM_SECONDS) ?
                                 StringFormat("%d sec (stats)", InpCustomExpirySeconds) :
                                 StringFormat("%d candle(s)", (int)InpExpiryMode);
      d.regime_label          = "See per-symbol scan";
      d.trend_entry_label     = "Entry TF";
      d.trend_entry_value     = "-";
      d.trend_confirm_label   = EnumToString(InpConfirmTimeframe);
      d.trend_confirm_value   = "-";
      d.trend_trend_label     = EnumToString(InpTrendTimeframe);
      d.trend_trend_value     = "-";
      d.volatility_label      = "-";
      d.call_score            = 0; d.put_score = 0; d.confidence = 0; d.confidence_threshold = 0;
      d.blocking_filters      = "TESTER MODE";
      d.current_signal        = "-";
      d.last_signal_result    = "-";
      d.total_settled          = g_stats_all.TotalSignals();
      d.wins                   = g_stats_all.Wins();
      d.losses                 = g_stats_all.Losses();
      d.draws                  = g_stats_all.Draws();
      d.win_rate_text           = g_stats_all.WinRateDisplayText();
      d.consecutive_wins        = g_stats_all.CurrentConsecutiveWins();
      d.consecutive_losses      = g_stats_all.CurrentConsecutiveLosses();
      d.max_consecutive_losses  = g_stats_all.MaxConsecutiveLosses();
      d.todays_signals          = g_stats_all.SignalsToday();
      d.session_win_rate        = g_stats_all.SessionWinRate();
      d.data_feed_status        = "HISTORICAL (tester)";
      d.auto_trading_status     = "DISABLED (signal tester)";
      g_dashboard.Render(d);
     }
  }

//+------------------------------------------------------------------+
//| Balanced custom optimization score. Rewards expected value and   |
//| profit factor scaled by sample size, and PENALIZES small samples,|
//| excessive drawdown, excessive consecutive losses and a collapse  |
//| between in-sample and forward-test performance. Never optimizes  |
//| for win rate alone.                                              |
//+------------------------------------------------------------------+
double OnTester(void)
  {
   int total = g_stats_all.TotalSignals();
   int market_days = ArraySize(g_market_days);
   int symbol_count = ArraySize(g_ctx);

   //--- hard floor: reject parameter sets that fail the minimum validation requirements outright
   if(total < InpMinRequiredTrades)
      return(-1000.0 + total); // still ranks smaller shortfalls above larger ones
   if(market_days < InpMinMarketDays)
      return(-900.0 + market_days);
   if(symbol_count < InpMinSymbols)
      return(-800.0);

   double payout = InpSimPayoutPercent;

   double ev_all = g_stats_all.ExpectedValuePerSignal(payout);
   double pf_all = g_stats_all.ProfitFactorSimulation(payout);
   double dd_all = g_stats_all.MaxSimulatedDrawdown(payout, 1.0);
   int    max_consec_losses = g_stats_all.MaxConsecutiveLosses();

   double sample_score = MathMin(1.0, (double)total / (double)InpMinRequiredTrades);

   double drawdown_penalty = MathMax(0.0, dd_all - InpMaxAcceptableDrawdown);
   double consec_loss_penalty = MathMax(0.0, (double)(max_consec_losses - InpMaxAcceptableConsecLosses));

   //--- forward-test stability: penalize a large gap between in-sample and forward EV
   double forward_penalty = 0.0;
   if(g_stats_forward.TotalSignals() >= MathMax(30, InpMinSampleSize / 4))
     {
      double ev_train = g_stats_insample.ExpectedValuePerSignal(payout);
      double ev_forward = g_stats_forward.ExpectedValuePerSignal(payout);
      double gap = ev_train - ev_forward;
      if(gap > 0.0)
         forward_penalty = gap * 100.0; // forward collapse relative to training is heavily penalized
     }
   else
     {
      //--- forward window configured but insufficient forward sample: treat as a stability warning
      if(InpForwardStart > 0)
         forward_penalty = 5.0;
     }

   double score = 0.0;
   score += ev_all * 100.0 * (InpWeightExpectedValue / 100.0);
   score += MathMin(pf_all, 5.0) * (InpWeightProfitFactor / 100.0) * 20.0;
   score += sample_score * InpWeightSampleSize;
   score -= drawdown_penalty * (InpWeightDrawdownPenalty / 100.0);
   score -= consec_loss_penalty * (InpWeightConsecLossPenalty / 100.0) * 5.0;
   score -= forward_penalty * (InpWeightForwardStability / 100.0);

   PrintFormat("OTCSignalTesterEA OnTester: total=%d days=%d symbols=%d EV=%.4f PF=%.3f DD=%.2f maxConsecLoss=%d score=%.3f",
               total, market_days, symbol_count, ev_all, pf_all, dd_all, max_consec_losses, score);

   return(score);
  }
//+------------------------------------------------------------------+
