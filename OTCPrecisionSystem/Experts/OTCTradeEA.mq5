//+------------------------------------------------------------------+
//|                                              OTCTradeEA.mq5      |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| OPTIONAL automatic-trading EA. DISABLED BY DEFAULT                |
//| (InpMasterEnable = false). This EA trades ONLY conventional      |
//| symbols supplied directly by the logged-in MT5 broker through    |
//| normal market/pending orders. It never places, simulates, or     |
//| claims to place Quotex-style binary UP/DOWN trades of any kind.  |
//|                                                                    |
//| DEMO-ONLY WARNING: Do not enable this EA on a live account until |
//| the signal engine has been validated with the walk-forward       |
//| process described in the README, using a sufficient out-of-      |
//| sample sample size. Past or simulated performance is never a     |
//| guarantee of future results.                                     |
//|                                                                    |
//| This EA contains NO martingale, grid, or recovery-multiplier      |
//| logic. Position size is derived only from the configured risk    |
//| percentage / fixed lot and the current, independent trade's      |
//| stop-loss distance.                                               |
//+------------------------------------------------------------------+
#property copyright "OTC Precision Signal System"
#property link      ""
#property version   "1.00"
#property strict

#include <OTCPrecision/MarketRegime.mqh>
#include <OTCPrecision/SignalEngine.mqh>
#include <OTCPrecision/RiskManager.mqh>

//====================================================================
// INPUTS
//====================================================================

input string   Inp_General                    = "==== General ====";
input int      InpMinHistoryBars               = 250;
input bool     InpDebugLogging                  = false;
input long     InpMagicNumber                   = 20260802;

input string   Inp_MasterSwitch                = "==== MASTER SWITCH ====";
input bool     InpMasterEnable                  = false;     // MUST be explicitly set true to allow live orders
input bool     InpDemoOnlyAcknowledged           = false;     // Explicit acknowledgement of the demo-only warning below

input string   Inp_Mode                        = "==== Signal Mode ====";
input ENUM_ENGINE_MODE InpSignalMode            = ENGINE_MODE_CONSERVATIVE;

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

//--- EA risk controls
input string   Inp_Risk                        = "==== EA Risk Controls ====";
input ENUM_LOT_MODE InpLotMode                  = LOT_MODE_PERCENT_RISK;
input double   InpFixedLot                       = 0.01;
input double   InpRiskPercent                    = 0.25;       // Default risk per trade: 0.25%
input double   InpSLAtrMultiplier                = 1.5;        // Stop loss = ATR * this multiplier
input double   InpMinRewardRisk                  = 1.2;        // Minimum reward:risk ratio
input double   InpTPRewardRiskRatio              = 1.5;        // Take profit reward:risk ratio used to place TP
input double   InpMaxSpreadPointsTrade           = 25.0;
input int      InpMaxTradesPerDay                = 10;
input double   InpMaxDailyLossPercent            = 3.0;
input int      InpMaxConsecutiveLosses           = 4;
input double   InpEmergencyEquityStopPercent     = 10.0;
input bool     InpUseTradingHours                = false;
input int      InpTradingHourStart               = 0;
input int      InpTradingHourEnd                 = 23;

input string   Inp_Debug                       = "==== Debugging ====";
input bool     InpShowChartComment              = true;

//====================================================================
// GLOBALS
//====================================================================

CSignalEngine  g_engine;
CRiskManager   g_risk;
datetime       g_last_bar_time = 0;

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
int OnInit(void)
  {
   if(InpMasterEnable && !InpDemoOnlyAcknowledged)
     {
      Print("OTCTradeEA: InpMasterEnable is TRUE but InpDemoOnlyAcknowledged is FALSE. ",
            "Refusing to arm live trading until the demo-only warning is explicitly acknowledged.");
     }

   bool is_demo_account = ((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);
   PrintFormat("OTCTradeEA: initializing. MasterEnable=%s AccountIsDemo=%s",
               InpMasterEnable ? "TRUE" : "FALSE", is_demo_account ? "TRUE" : "FALSE");

   SEngineSettings cfg;
   BuildSettings(cfg);
   if(!g_engine.Init(_Symbol, (ENUM_TIMEFRAMES)Period(), cfg))
     {
      Print("OTCTradeEA: engine initialization failed.");
      return(INIT_FAILED);
     }

   g_risk.Configure(InpLotMode, InpFixedLot, InpRiskPercent, InpMinRewardRisk, InpMaxSpreadPointsTrade,
                     InpMaxTradesPerDay, InpMaxDailyLossPercent, InpMaxConsecutiveLosses,
                     InpEmergencyEquityStopPercent, InpUseTradingHours, InpTradingHourStart, InpTradingHourEnd);

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   g_engine.Deinit();
   Comment("");
  }

//+------------------------------------------------------------------+
bool IsNewBar(void)
  {
   datetime t[];
   ArraySetAsSeries(t, true);
   if(CopyTime(_Symbol, PERIOD_CURRENT, 0, 1, t) < 1)
      return(false);
   if(t[0] == g_last_bar_time)
      return(false);
   g_last_bar_time = t[0];
   return(true);
  }

//+------------------------------------------------------------------+
//| Pick a filling mode actually supported by this symbol/broker,    |
//| falling back safely instead of assuming FOK is always available. |
//+------------------------------------------------------------------+
ENUM_ORDER_TYPE_FILLING GetSupportedFillingMode(const string symbol)
  {
   long flags = SymbolInfoInteger(symbol, SYMBOL_FILLING_MODE);
   if((flags & SYMBOL_FILLING_FOK) != 0)
      return(ORDER_FILLING_FOK);
   if((flags & SYMBOL_FILLING_IOC) != 0)
      return(ORDER_FILLING_IOC);
   return(ORDER_FILLING_RETURN);
  }

//+------------------------------------------------------------------+
//| Send a conventional market order on the broker-supplied symbol.  |
//| This is an ordinary MT5 buy/sell order with SL/TP - never a      |
//| binary-options / Quotex-style UP/DOWN instruction of any kind.   |
//+------------------------------------------------------------------+
bool OpenTrade(const int direction, const double atr_value)
  {
   string block_reason;
   if(!g_risk.CanOpenNewTrade(_Symbol, block_reason))
     {
      if(InpDebugLogging)
         PrintFormat("OTCTradeEA: trade blocked - %s", block_reason);
      return(false);
     }

   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int    digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double sl_distance = atr_value * InpSLAtrMultiplier;
   double tp_distance = sl_distance * InpTPRewardRiskRatio;
   double sl_points = sl_distance / point;
   double tp_points = tp_distance / point;

   if(!g_risk.CheckRewardRisk(tp_points, sl_points))
     {
      if(InpDebugLogging)
         Print("OTCTradeEA: trade blocked - reward:risk below minimum");
      return(false);
     }

   double lots = g_risk.CalculateLotSize(_Symbol, sl_points);
   if(lots <= 0.0)
     {
      Print("OTCTradeEA: computed lot size is zero, aborting trade");
      return(false);
     }

   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
     {
      Print("OTCTradeEA: failed to read current tick");
      return(false);
     }

   MqlTradeRequest request;
   MqlTradeResult  result;
   ZeroMemory(request);
   ZeroMemory(result);

   request.action    = TRADE_ACTION_DEAL;
   request.symbol    = _Symbol;
   request.volume    = lots;
   request.magic     = (ulong)InpMagicNumber;
   request.type_filling = GetSupportedFillingMode(_Symbol);
   request.deviation = 20;
   request.comment    = "OTCPrecision";

   if(direction == OTC_DIR_CALL)
     {
      request.type  = ORDER_TYPE_BUY;
      request.price  = tick.ask;
      request.sl     = NormalizeDouble(tick.ask - sl_distance, digits);
      request.tp     = NormalizeDouble(tick.ask + tp_distance, digits);
     }
   else
     {
      request.type  = ORDER_TYPE_SELL;
      request.price  = tick.bid;
      request.sl     = NormalizeDouble(tick.bid + sl_distance, digits);
      request.tp     = NormalizeDouble(tick.bid - tp_distance, digits);
     }

   if(!OrderSend(request, result))
     {
      PrintFormat("OTCTradeEA: OrderSend failed, retcode=%d comment=%s", result.retcode, result.comment);
      return(false);
     }

   if(result.retcode != TRADE_RETCODE_DONE && result.retcode != TRADE_RETCODE_PLACED)
     {
      PrintFormat("OTCTradeEA: order not executed, retcode=%d comment=%s", result.retcode, result.comment);
      return(false);
     }

   g_risk.RegisterTradeOpened();
   PrintFormat("OTCTradeEA: opened %s %.2f lots on %s SL=%.5f TP=%.5f",
               direction == OTC_DIR_CALL ? "BUY" : "SELL", lots, _Symbol, request.sl, request.tp);
   return(true);
  }

//+------------------------------------------------------------------+
//| Detect closed positions belonging to this EA and register the    |
//| realized result with the risk manager (purely for filtering -    |
//| position size is never scaled up in response to losses).         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                         const MqlTradeRequest &request,
                         const MqlTradeResult &result)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   if(!HistoryDealSelect(trans.deal))
      return;

   if((long)HistoryDealGetInteger(trans.deal, DEAL_MAGIC) != InpMagicNumber)
      return;

   if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY) != DEAL_ENTRY_OUT)
      return;

   double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT) + HistoryDealGetDouble(trans.deal, DEAL_SWAP) +
                    HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);
   g_risk.RegisterTradeClosed(profit);
  }

//+------------------------------------------------------------------+
void UpdateComment(const SEngineOutput &sig)
  {
   if(!InpShowChartComment)
      return;

   bool is_demo = ((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);

   string warning = is_demo ?
                     "DEMO ACCOUNT - safe for live-forward validation" :
                     "*** LIVE ACCOUNT *** - ensure validation is complete before trading real funds";

   string text = StringFormat(
      "OTC Precision Trade EA\n" +
      "Master switch: %s\n" +
      "%s\n" +
      "Symbol: %s   Direction bias: %s   Confidence: %.1f\n" +
      "Regime: %s   Blocking: %s\n" +
      "Trades today: %d   Consecutive losses: %d\n" +
      "Halted: %s\n" +
      "No martingale / grid / recovery multiplier is used.",
      InpMasterEnable ? "ENABLED" : "DISABLED",
      warning,
      _Symbol,
      sig.direction == OTC_DIR_CALL ? "CALL" : (sig.direction == OTC_DIR_PUT ? "PUT" : "NONE"),
      sig.confidence,
      RegimeToString(sig.regime),
      StringLen(sig.blocking_filter) == 0 ? "NONE" : sig.blocking_filter,
      g_risk.TradesToday(),
      g_risk.ConsecutiveLosses(),
      g_risk.IsHalted() ? "YES" : "NO");

   Comment(text);
  }

//+------------------------------------------------------------------+
void OnTick(void)
  {
   g_risk.OnTick();

   if(!IsNewBar())
      return;

   SEngineOutput sig = g_engine.Evaluate(1);
   if(!sig.data_ready)
      return;

   g_engine.MarkBarProcessed(sig.bar_time);

   UpdateComment(sig);

   if(!sig.is_final_signal)
      return;

   g_engine.RegisterConfirmedSignal(sig.bar_time);

   if(!InpMasterEnable)
     {
      if(InpDebugLogging)
         Print("OTCTradeEA: signal detected but master switch is DISABLED - no order sent.");
      return;
     }

   if(!InpDemoOnlyAcknowledged)
     {
      Print("OTCTradeEA: signal detected but demo-only warning has not been acknowledged - no order sent.");
      return;
     }

   OpenTrade(sig.direction, sig.atr_value);
  }
//+------------------------------------------------------------------+
