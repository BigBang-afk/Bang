//+------------------------------------------------------------------+
//|                                       OTCPrecisionIndicator.mq5  |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Non-repainting CALL / PUT confluence signal indicator for short- |
//| duration analysis (M1-M15). Confirmed signals are only ever      |
//| generated on fully closed candles and, once drawn, an arrow      |
//| never moves, is never deleted, and never changes color.          |
//|                                                                    |
//| IMPORTANT: This tool does not guarantee any win rate. The 85     |
//| confidence default is a scoring threshold used to filter for     |
//| higher-quality, lower-frequency signals - it is NOT a promised   |
//| or displayed win rate. The only win rate ever shown on the       |
//| dashboard is measured directly from settled historical signals.  |
//+------------------------------------------------------------------+
#property copyright "OTC Precision Signal System"
#property link      ""
#property version   "1.00"
#property strict
#property indicator_chart_window
#property indicator_buffers 3
#property indicator_plots   3

#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLimeGreen
#property indicator_width1  2
#property indicator_label1  "CALL signal"

#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrRed
#property indicator_width2  2
#property indicator_label2  "PUT signal"

#property indicator_type3   DRAW_ARROW
#property indicator_color3  clrGray
#property indicator_width3  1
#property indicator_label3  "NO TRADE"

#include <OTCPrecision/MarketRegime.mqh>
#include <OTCPrecision/SignalEngine.mqh>
#include <OTCPrecision/Statistics.mqh>
#include <OTCPrecision/Dashboard.mqh>

//====================================================================
// INPUTS
//====================================================================

//--- General
input string   Inp_General                    = "==== General ====";      // General
input int      InpMinHistoryBars               = 250;                     // Minimum historical bars required
input bool     InpDebugLogging                  = false;                   // Verbose debug logging

//--- Signal mode
input string   Inp_Mode                        = "==== Signal Mode ====";  // Signal Mode
input ENUM_ENGINE_MODE InpSignalMode            = ENGINE_MODE_CONSERVATIVE;// Signal mode preset

//--- Expiry
input string   Inp_Expiry                      = "==== Expiry ====";       // Expiry
enum ENUM_EXPIRY_MODE
  {
   EXPIRY_1_CANDLE = 1,
   EXPIRY_2_CANDLES = 2,
   EXPIRY_3_CANDLES = 3,
   EXPIRY_5_CANDLES = 5,
   EXPIRY_CUSTOM_SECONDS = 0
  };
input ENUM_EXPIRY_MODE InpExpiryMode            = EXPIRY_1_CANDLE;         // Expiry mode
input int      InpCustomExpirySeconds           = 60;                      // Custom expiry (seconds, stats only)

//--- Trend
input string   Inp_Trend                       = "==== Trend ====";        // Trend
input int      InpEmaFastPeriod                 = 20;                      // EMA fast period
input int      InpEmaMidPeriod                  = 50;                      // EMA mid period
input int      InpEmaSlowPeriod                 = 200;                     // EMA slow period
input int      InpEmaSlopeLookback              = 5;                       // EMA slope lookback (bars)

//--- Momentum
input string   Inp_Momentum                    = "==== Momentum ====";     // Momentum
input int      InpRsiPeriod                     = 14;                      // RSI period
input int      InpStochK                        = 5;                       // Stochastic %K
input int      InpStochD                        = 3;                       // Stochastic %D
input int      InpStochSlowing                  = 3;                       // Stochastic slowing
input int      InpMacdFast                      = 12;                      // MACD fast EMA
input int      InpMacdSlow                      = 26;                      // MACD slow EMA
input int      InpMacdSignal                    = 9;                       // MACD signal
input int      InpRocPeriod                     = 10;                      // Rate of change period

//--- Structure
input string   Inp_Structure                   = "==== Structure ====";    // Structure
input int      InpSwingLookback                 = 3;                       // Swing/fractal arm length
input int      InpStructureSearchBars           = 80;                      // Structure search window (bars)

//--- Price action
input string   Inp_PriceAction                 = "==== Price Action ===="; // Price Action (no extra inputs - uses candle geometry)

//--- Support/Resistance
input string   Inp_SR                          = "==== Support/Resistance ===="; // Support/Resistance
input int      InpSRSwingLookback               = 20;                      // S/R swing lookback (bars)
input double   InpSRAtrDistanceMult             = 0.5;                     // S/R proximity filter (x ATR)
input bool     InpUsePrevDayLevels              = true;                    // Use previous day high/low
input bool     InpUsePrevSessionLevels          = true;                    // Use previous session (H4) high/low
input bool     InpUseRoundLevels                = true;                    // Use psychological round levels
input double   InpRoundLevelStep                = 0.0010;                  // Round level step (price units)

//--- Liquidity
input string   Inp_Liquidity                   = "==== Liquidity ====";    // Liquidity
input int      InpLiquidityLookback             = 15;                      // Liquidity sweep lookback (bars)
input double   InpLiquiditySweepAtrMult         = 0.25;                    // Liquidity sweep margin (x ATR)

//--- Volatility
input string   Inp_Volatility                  = "==== Volatility ====";   // Volatility
input int      InpAtrPeriod                     = 14;                      // ATR period
input int      InpBBPeriod                      = 20;                      // Bollinger Bands period
input double   InpBBDeviation                   = 2.0;                     // Bollinger Bands deviation
input double   InpMinBodyAtrRatio               = 0.15;                    // Min body/ATR ratio (reject small candles)
input double   InpMaxAtrSpikeRatio              = 2.5;                     // Max ATR spike ratio
input int      InpVolPercentileLookback         = 100;                     // Volatility percentile lookback
input double   InpHighVolPercentile             = 90.0;                    // High-volatility percentile
input double   InpLowVolPercentile              = 10.0;                    // Low-volatility percentile
input int      InpAdxPeriod                     = 14;                      // ADX period (regime)
input double   InpAdxTrendThreshold             = 22.0;                    // ADX trending threshold

//--- Multi-timeframe
input string   Inp_MTF                         = "==== Multi-Timeframe ===="; // Multi-Timeframe
input ENUM_TIMEFRAMES InpConfirmTimeframe       = PERIOD_M5;                // Confirmation timeframe
input ENUM_TIMEFRAMES InpTrendTimeframe         = PERIOD_M15;               // Trend timeframe

//--- Confidence scoring
input string   Inp_Confidence                  = "==== Confidence Scoring ===="; // Confidence Scoring
input double   InpMinConfidenceCustom           = 85.0;                    // [Custom mode] Minimum confidence
input int      InpMinModulesAgreeingCustom      = 6;                       // [Custom mode] Minimum modules agreeing
input bool     InpRequireHtfCustom              = true;                    // [Custom mode] Require HTF confirmation
input bool     InpRequireStructureCustom        = true;                    // [Custom mode] Require structure confirmation
input bool     InpRequirePriceActionCustom      = true;                    // [Custom mode] Require price-action confirmation
input bool     InpBlockNearSrCustom             = true;                    // [Custom mode] Block signals near S/R
input bool     InpBlockAbnormalVolCustom        = true;                    // [Custom mode] Block abnormal volatility
input int      InpMinCooldownCustom             = 3;                       // [Custom mode] Minimum cooldown (candles)
input double   InpWeightStructure               = 15.0;                    // Weight: Structure
input double   InpWeightTrend                   = 20.0;                    // Weight: Trend
input double   InpWeightMomentum                = 15.0;                    // Weight: Momentum
input double   InpWeightPriceAction             = 15.0;                    // Weight: Price action
input double   InpWeightSR                      = 10.0;                    // Weight: Support/Resistance
input double   InpWeightLiquidity               = 10.0;                    // Weight: Liquidity
input double   InpWeightMTF                     = 15.0;                    // Weight: Multi-timeframe

//--- No-trade filters
input string   Inp_NoTrade                     = "==== No-Trade Filters ===="; // No-Trade Filters
input double   InpMaxSpreadPoints               = 25.0;                    // Max spread (points)
input double   InpMaxDataGapMultiplier          = 3.0;                     // Max data gap (x period)
input bool     InpUseNewsWindows                = false;                   // Enable manual news-window filter
input string   InpNewsWindows                   = "";                      // News windows "YYYY.MM.DD HH:MM-HH:MM;..."

//--- Alerts
input string   Inp_Alerts                      = "==== Alerts ====";       // Alerts
input bool     InpAlertPopup                    = true;                    // Popup alert
input bool     InpAlertSound                    = true;                    // Sound alert
input string   InpAlertSoundFile                = "alert.wav";             // Sound file
input bool     InpAlertPush                     = false;                   // Push notification
input bool     InpAlertEmail                    = false;                   // Email alert
input bool     InpAlertCSVLog                   = true;                    // Log signals to CSV

//--- Statistics
input string   Inp_Stats                       = "==== Statistics ====";   // Statistics
input int      InpMinSampleSize                 = 200;                     // Minimum settled signals for a displayed win rate
input double   InpSimPayoutPercent              = 85.0;                    // Simulated payout percent (profit factor / EV / drawdown sim)

//--- Dashboard
input string   Inp_Dashboard                   = "==== Dashboard ====";    // Dashboard
input bool     InpShowDashboard                 = true;                    // Show dashboard panel
input int      InpDashboardX                    = 14;                      // Dashboard X offset (px)
input int      InpDashboardY                    = 20;                      // Dashboard Y offset (px)
input int      InpDashboardFontSize             = 8;                       // Dashboard font size

//--- Preview
input string   Inp_Preview                     = "==== Preview ====";      // Preview
input bool     InpShowPreview                   = false;                   // Show forming-candle preview (disabled by default)

//--- Arrows
input string   Inp_Arrows                      = "==== Arrows ====";       // Arrows
input double   InpArrowAtrDistanceMult          = 0.6;                     // Arrow distance from candle (x ATR)
input bool     InpShowNoTradeMarker             = false;                   // Show grey NO TRADE marker
input bool     InpShowConfidenceLabel           = true;                    // Show compact confidence/expiry label

//--- Authorized feed
input string   Inp_Feed                        = "==== Authorized Feed ===="; // Authorized Feed
input int      InpStaleFeedMinutes              = 15;                      // Minutes without a new bar before "STALE" is shown

//====================================================================
// GLOBALS
//====================================================================

double         BufCall[];
double         BufPut[];
double         BufNoTrade[];

CSignalEngine      g_engine;
CSignalStatistics  g_stats;
CDashboard         g_dashboard;

int            g_csv_handle = INVALID_HANDLE;
string         g_csv_filename = "";

datetime       g_last_alert_bar_time = 0;
string         g_global_var_name = "";

string         g_last_signal_dir_text  = "NONE";
int            g_last_settled_result   = -2; // -2 = N/A, -1 loss, 0 draw, 1 win

//--- pending (unsettled) signal queue
struct SPendingSignal
  {
   datetime signal_time;
   datetime expiry_time;
   int      expiry_target_bar_count; // candles to wait, 0 if time-based
   int      target_bar_index;        // absolute bar index (non-series) at which it settles, -1 if time based
   string   symbol;
   ENUM_TIMEFRAMES timeframe;
   int      direction;
   double   entry_price;
   double   confidence;
   int      modules_agreeing;
   ENUM_MARKET_REGIME regime;
   bool     settled;
  };
SPendingSignal g_pending[];

//+------------------------------------------------------------------+
bool IsSupportedTimeframe(const ENUM_TIMEFRAMES tf)
  {
   return(tf == PERIOD_M1 || tf == PERIOD_M2 || tf == PERIOD_M3 || tf == PERIOD_M5 || tf == PERIOD_M15);
  }

//+------------------------------------------------------------------+
void BuildSettings(SEngineSettings &cfg)
  {
   cfg.mode = InpSignalMode;

   cfg.ema_fast_period    = InpEmaFastPeriod;
   cfg.ema_mid_period     = InpEmaMidPeriod;
   cfg.ema_slow_period    = InpEmaSlowPeriod;
   cfg.ema_slope_lookback = InpEmaSlopeLookback;

   cfg.rsi_period        = InpRsiPeriod;
   cfg.stoch_k_period     = InpStochK;
   cfg.stoch_d_period     = InpStochD;
   cfg.stoch_slowing      = InpStochSlowing;
   cfg.macd_fast_period   = InpMacdFast;
   cfg.macd_slow_period   = InpMacdSlow;
   cfg.macd_signal_period = InpMacdSignal;
   cfg.roc_period         = InpRocPeriod;

   cfg.swing_lookback        = InpSwingLookback;
   cfg.structure_search_bars = InpStructureSearchBars;

   cfg.atr_period                     = InpAtrPeriod;
   cfg.bb_period                       = InpBBPeriod;
   cfg.bb_deviation                    = InpBBDeviation;
   cfg.min_body_atr_ratio              = InpMinBodyAtrRatio;
   cfg.max_atr_spike_ratio             = InpMaxAtrSpikeRatio;
   cfg.volatility_percentile_lookback  = InpVolPercentileLookback;
   cfg.high_vol_percentile             = InpHighVolPercentile;
   cfg.low_vol_percentile              = InpLowVolPercentile;
   cfg.adx_period                      = InpAdxPeriod;
   cfg.adx_trend_threshold             = InpAdxTrendThreshold;

   cfg.sr_swing_lookback       = InpSRSwingLookback;
   cfg.sr_atr_distance_mult    = InpSRAtrDistanceMult;
   cfg.use_prev_day_levels     = InpUsePrevDayLevels;
   cfg.use_prev_session_levels = InpUsePrevSessionLevels;
   cfg.use_round_levels        = InpUseRoundLevels;
   cfg.round_level_step        = InpRoundLevelStep;

   cfg.liquidity_lookback       = InpLiquidityLookback;
   cfg.liquidity_sweep_atr_mult = InpLiquiditySweepAtrMult;

   cfg.confirm_timeframe = InpConfirmTimeframe;
   cfg.trend_timeframe   = InpTrendTimeframe;

   cfg.weight_structure    = InpWeightStructure;
   cfg.weight_trend        = InpWeightTrend;
   cfg.weight_momentum     = InpWeightMomentum;
   cfg.weight_price_action = InpWeightPriceAction;
   cfg.weight_sr           = InpWeightSR;
   cfg.weight_liquidity    = InpWeightLiquidity;
   cfg.weight_mtf          = InpWeightMTF;

   cfg.max_spread_points       = InpMaxSpreadPoints;
   cfg.max_data_gap_multiplier = InpMaxDataGapMultiplier;
   cfg.min_history_bars        = InpMinHistoryBars;

   //--- confidence / gating: mode presets override custom inputs unless mode == CUSTOM
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
      default: // ENGINE_MODE_CUSTOM
         cfg.min_confidence = InpMinConfidenceCustom;
         cfg.min_modules_agreeing = InpMinModulesAgreeingCustom;
         cfg.require_htf_confirmation = InpRequireHtfCustom;
         cfg.require_structure_confirmation = InpRequireStructureCustom;
         cfg.require_price_action_confirmation = InpRequirePriceActionCustom;
         cfg.block_near_sr = InpBlockNearSrCustom;
         cfg.block_abnormal_volatility = InpBlockAbnormalVolCustom;
         cfg.min_cooldown_candles = InpMinCooldownCustom;
         break;
     }
  }

//+------------------------------------------------------------------+
int ExpirySeconds(void)
  {
   if(InpExpiryMode == EXPIRY_CUSTOM_SECONDS)
      return(MathMax(1, InpCustomExpirySeconds));
   return((int)InpExpiryMode * (int)PeriodSeconds(PERIOD_CURRENT));
  }

//+------------------------------------------------------------------+
int ExpiryCandles(void)
  {
   if(InpExpiryMode == EXPIRY_CUSTOM_SECONDS)
      return(0);
   return((int)InpExpiryMode);
  }

//+------------------------------------------------------------------+
string ExpiryLabel(void)
  {
   if(InpExpiryMode == EXPIRY_CUSTOM_SECONDS)
      return(StringFormat("%d sec (stats)", InpCustomExpirySeconds));
   return(StringFormat("%d candle(s)", (int)InpExpiryMode));
  }

//+------------------------------------------------------------------+
bool IsWithinNewsWindow(const datetime t)
  {
   if(!InpUseNewsWindows || StringLen(InpNewsWindows) == 0)
      return(false);

   string windows[];
   int n = StringSplit(InpNewsWindows, ';', windows);
   for(int i = 0; i < n; i++)
     {
      string w = windows[i];
      StringTrimLeft(w); StringTrimRight(w);
      if(StringLen(w) == 0) continue;
      int dash = StringFind(w, "-");
      if(dash < 0) continue;
      string start_part = StringSubstr(w, 0, dash);
      string end_part    = StringSubstr(w, dash + 1);
      datetime start_time = StringToTime(start_part);
      //--- end part is HH:MM only -> combine with the same date as start
      string date_part = StringSubstr(start_part, 0, 11);
      datetime end_time = StringToTime(date_part + end_part);
      if(start_time == 0 || end_time == 0) continue;
      if(t >= start_time && t <= end_time)
         return(true);
     }
   return(false);
  }

//+------------------------------------------------------------------+
void EnsureCSVFile(void)
  {
   if(!InpAlertCSVLog)
      return;
   g_csv_filename = "OTCPrecision_" + _Symbol + "_" + EnumToString((ENUM_TIMEFRAMES)Period()) + "_signals.csv";

   bool exists = FileIsExist(g_csv_filename);
   g_csv_handle = FileOpen(g_csv_filename, FILE_READ | FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(g_csv_handle == INVALID_HANDLE)
     {
      PrintFormat("OTCPrecisionIndicator: failed to open CSV log file %s (err=%d)", g_csv_filename, GetLastError());
      return;
     }
   FileSeek(g_csv_handle, 0, SEEK_END);
   if(!exists)
      CSignalStatistics::WriteCSVHeader(g_csv_handle);
  }

//+------------------------------------------------------------------+
int OnInit(void)
  {
   ArraySetAsSeries(BufCall, false);
   ArraySetAsSeries(BufPut, false);
   ArraySetAsSeries(BufNoTrade, false);

   SetIndexBuffer(0, BufCall, INDICATOR_DATA);
   SetIndexBuffer(1, BufPut, INDICATOR_DATA);
   SetIndexBuffer(2, BufNoTrade, INDICATOR_DATA);

   PlotIndexSetInteger(0, PLOT_ARROW, 233); // wingdings up arrow
   PlotIndexSetInteger(1, PLOT_ARROW, 234); // wingdings down arrow
   PlotIndexSetInteger(2, PLOT_ARROW, 159); // wingdings dot

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(2, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   ArrayInitialize(BufCall, EMPTY_VALUE);
   ArrayInitialize(BufPut, EMPTY_VALUE);
   ArrayInitialize(BufNoTrade, EMPTY_VALUE);

   IndicatorSetString(INDICATOR_SHORTNAME, "OTC Precision [" + EnumToString(InpSignalMode) + "]");

   if(!IsSupportedTimeframe((ENUM_TIMEFRAMES)Period()))
      PrintFormat("OTCPrecisionIndicator: WARNING - chart timeframe %s is not in the officially supported list (M1,M2,M3,M5,M15).",
                  EnumToString((ENUM_TIMEFRAMES)Period()));

   SEngineSettings cfg;
   BuildSettings(cfg);
   if(!g_engine.Init(_Symbol, (ENUM_TIMEFRAMES)Period(), cfg))
     {
      Print("OTCPrecisionIndicator: engine initialization failed.");
      return(INIT_FAILED);
     }

   g_stats.Init(InpMinSampleSize, InpSimPayoutPercent);

   if(InpShowDashboard)
      g_dashboard.Init(0, "OTCP_DASH_", InpDashboardX, InpDashboardY, InpDashboardFontSize);

   EnsureCSVFile();

   //--- restore last-alerted bar time to prevent duplicate alerts after a restart
   g_global_var_name = "OTCP_LASTALERT_" + _Symbol + "_" + IntegerToString(Period());
   if(GlobalVariableCheck(g_global_var_name))
      g_last_alert_bar_time = (datetime)GlobalVariableGet(g_global_var_name);

   ArrayResize(g_pending, 0);

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   g_engine.Deinit();
   if(InpShowDashboard)
      g_dashboard.Deinit();

   int total = ObjectsTotal(0, 0, -1);
   for(int i = total - 1; i >= 0; i--)
     {
      string name = ObjectName(0, i, 0, -1);
      if(StringFind(name, "OTCP_") == 0)
         ObjectDelete(0, name);
     }

   if(g_csv_handle != INVALID_HANDLE)
     {
      FileClose(g_csv_handle);
      g_csv_handle = INVALID_HANDLE;
     }

   GlobalVariableSet(g_global_var_name, (double)g_last_alert_bar_time);
  }

//+------------------------------------------------------------------+
void DrawArrow(const int direction, const datetime bar_time, const double bar_high, const double bar_low,
               const double atr_value, const int buffer_index_for_time, double &buf_call[], double &buf_put[])
  {
   double distance = atr_value * InpArrowAtrDistanceMult;
   if(direction == OTC_DIR_CALL)
      buf_call[buffer_index_for_time] = bar_low - distance;
   else if(direction == OTC_DIR_PUT)
      buf_put[buffer_index_for_time] = bar_high + distance;
  }

//+------------------------------------------------------------------+
void DrawConfidenceLabel(const datetime bar_time, const double price, const int direction,
                          const double confidence, const string expiry_label)
  {
   if(!InpShowConfidenceLabel)
      return;
   string name = StringFormat("OTCP_LBL_%s_%d", _Symbol, (long)bar_time);
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_TEXT, 0, bar_time, price);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_SELECTED, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, name, OBJPROP_ANCHOR, direction == OTC_DIR_CALL ? ANCHOR_TOP : ANCHOR_BOTTOM);
      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
      ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 7);
      ObjectSetInteger(0, name, OBJPROP_COLOR, direction == OTC_DIR_CALL ? clrLimeGreen : clrRed);
      ObjectSetString(0, name, OBJPROP_TEXT, StringFormat("%.0f%% | %s", confidence, expiry_label));
     }
  }

//+------------------------------------------------------------------+
void FireAlert(const SEngineOutput &sig, const string direction_text)
  {
   string message = StringFormat("OTC Precision | %s | %s | %s | Entry=%s | Confidence=%.1f | Expiry=%s | %s",
                                  _Symbol, EnumToString((ENUM_TIMEFRAMES)Period()), direction_text,
                                  DoubleToString(sig.entry_price, _Digits), sig.confidence, ExpiryLabel(),
                                  TimeToString(sig.bar_time, TIME_DATE | TIME_SECONDS));

   //--- duplicate-alert protection persists across terminal restarts via a global variable
   if(sig.bar_time <= g_last_alert_bar_time)
      return;

   if(InpAlertPopup)
      Alert(message);
   if(InpAlertSound)
      PlaySound(InpAlertSoundFile);
   if(InpAlertPush)
      SendNotification(message);
   if(InpAlertEmail)
      SendMail("OTC Precision Signal", message);

   g_last_alert_bar_time = sig.bar_time;
   GlobalVariableSet(g_global_var_name, (double)g_last_alert_bar_time);
  }

//+------------------------------------------------------------------+
void QueuePendingSignal(const SEngineOutput &sig, const int bar_index)
  {
   int n = ArraySize(g_pending);
   ArrayResize(g_pending, n + 1);
   g_pending[n].signal_time    = sig.bar_time;
   g_pending[n].symbol         = _Symbol;
   g_pending[n].timeframe      = (ENUM_TIMEFRAMES)Period();
   g_pending[n].direction      = sig.direction;
   g_pending[n].entry_price    = sig.entry_price;
   g_pending[n].confidence     = sig.confidence;
   g_pending[n].modules_agreeing = sig.modules_agreeing;
   g_pending[n].regime         = sig.regime;
   g_pending[n].settled        = false;

   int candles = ExpiryCandles();
   if(candles > 0)
     {
      g_pending[n].expiry_target_bar_count = candles;
      g_pending[n].target_bar_index = bar_index + candles;
      g_pending[n].expiry_time = sig.bar_time + (datetime)(candles * PeriodSeconds(PERIOD_CURRENT));
     }
   else
     {
      g_pending[n].expiry_target_bar_count = 0;
      g_pending[n].target_bar_index = -1;
      g_pending[n].expiry_time = sig.bar_time + (datetime)ExpirySeconds();
     }
  }

//+------------------------------------------------------------------+
//| Settle any pending signals whose expiry has now been reached     |
//| using the ACTUAL closed-candle price - never a future/incomplete |
//| price.                                                            |
//+------------------------------------------------------------------+
void SettlePending(const int bar_index, const datetime bar_time, const double bar_close)
  {
   for(int i = 0; i < ArraySize(g_pending); i++)
     {
      if(g_pending[i].settled)
         continue;

      bool due = false;
      if(g_pending[i].target_bar_index >= 0)
         due = (bar_index >= g_pending[i].target_bar_index);
      else
         due = (bar_time >= g_pending[i].expiry_time);

      if(!due)
         continue;

      int result = CSignalEngine::EvaluateOutcome(g_pending[i].direction, g_pending[i].entry_price, bar_close);

      SSignalRecord rec;
      rec.signal_time      = g_pending[i].signal_time;
      rec.expiry_time       = bar_time;
      rec.symbol            = g_pending[i].symbol;
      rec.timeframe         = g_pending[i].timeframe;
      rec.direction         = g_pending[i].direction;
      rec.entry_price       = g_pending[i].entry_price;
      rec.exit_price        = bar_close;
      rec.result             = result;
      rec.expiry_seconds     = ExpirySeconds();
      rec.regime             = g_pending[i].regime;
      rec.confidence         = g_pending[i].confidence;
      rec.modules_agreeing   = g_pending[i].modules_agreeing;

      g_stats.AddSettledSignal(rec);
      g_last_settled_result = result;

      if(InpAlertCSVLog && g_csv_handle != INVALID_HANDLE)
         CSignalStatistics::WriteCSVRow(g_csv_handle, rec);

      g_pending[i].settled = true;
     }

   //--- prune settled entries once the array grows large, keeping the most recent 500
   int total = ArraySize(g_pending);
   if(total > 2000)
     {
      int keep_from = total - 500;
      SPendingSignal tmp[];
      ArrayResize(tmp, total - keep_from);
      for(int k = keep_from; k < total; k++)
         tmp[k - keep_from] = g_pending[k];
      ArrayResize(g_pending, ArraySize(tmp));
      for(int k = 0; k < ArraySize(tmp); k++)
         g_pending[k] = tmp[k];
     }
  }

//+------------------------------------------------------------------+
string TrendText(const int dir)
  {
   if(dir > 0) return("BULLISH");
   if(dir < 0) return("BEARISH");
   return("FLAT");
  }

//+------------------------------------------------------------------+
void UpdateDashboard(const SEngineOutput &sig, const string feed_status)
  {
   if(!InpShowDashboard)
      return;

   SDashboardData d;
   d.symbol            = _Symbol;
   d.timeframe_label     = EnumToString((ENUM_TIMEFRAMES)Period());
   d.expiry_label        = ExpiryLabel();
   d.regime_label        = RegimeToString(sig.regime);

   d.trend_entry_label    = EnumToString((ENUM_TIMEFRAMES)Period()) + " Trend";
   d.trend_entry_value    = TrendText(sig.trend_entry);
   d.trend_confirm_label  = EnumToString(InpConfirmTimeframe) + " Trend";
   d.trend_confirm_value  = TrendText(sig.trend_confirm);
   d.trend_trend_label    = EnumToString(InpTrendTimeframe) + " Trend";
   d.trend_trend_value    = TrendText(sig.trend_trend);

   if(sig.regime == REGIME_HIGH_VOLATILITY) d.volatility_label = "HIGH";
   else if(sig.regime == REGIME_LOW_VOLATILITY) d.volatility_label = "LOW";
   else d.volatility_label = "NORMAL";

   d.call_score  = sig.call_score;
   d.put_score   = sig.put_score;
   d.confidence  = sig.confidence;
   d.confidence_threshold = g_engine.GetSettings().min_confidence;

   d.blocking_filters = (StringLen(sig.blocking_filter) == 0) ? "NONE" : sig.blocking_filter;

   if(sig.is_final_signal)
      d.current_signal = (sig.direction == OTC_DIR_CALL) ? "CALL" : "PUT";
   else
      d.current_signal = "NONE";

   if(g_last_settled_result == 1) d.last_signal_result = "WIN";
   else if(g_last_settled_result == -1) d.last_signal_result = "LOSS";
   else if(g_last_settled_result == 0) d.last_signal_result = "DRAW";
   else d.last_signal_result = "N/A";

   d.total_settled = g_stats.TotalSignals();
   d.wins           = g_stats.Wins();
   d.losses         = g_stats.Losses();
   d.draws          = g_stats.Draws();
   d.win_rate_text  = g_stats.WinRateDisplayText();

   d.consecutive_wins       = g_stats.CurrentConsecutiveWins();
   d.consecutive_losses     = g_stats.CurrentConsecutiveLosses();
   d.max_consecutive_losses = g_stats.MaxConsecutiveLosses();

   d.todays_signals    = g_stats.SignalsToday();
   d.session_win_rate  = g_stats.SessionWinRate();

   d.data_feed_status    = feed_status;
   d.auto_trading_status = "DISABLED (indicator only)";

   g_dashboard.Render(d);
  }

//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                 const int prev_calculated,
                 const datetime &time[],
                 const double &open[],
                 const double &high[],
                 const double &low[],
                 const double &close[],
                 const long &tick_volume[],
                 const long &volume[],
                 const int &spread[])
  {
   if(rates_total < InpMinHistoryBars)
      return(0);

   int start = (prev_calculated > 1) ? prev_calculated - 2 : 0;
   if(start < 0) start = 0;

   SEngineOutput last_output;
   bool have_output = false;

   for(int i = start; i < rates_total; i++)
     {
      int shift = rates_total - 1 - i;
      bool is_closed_bar = (i <= rates_total - 2);

      if(!is_closed_bar && !InpShowPreview)
         continue;

      SEngineOutput sig = g_engine.Evaluate(is_closed_bar ? shift : 0);
      if(!sig.data_ready)
         continue;

      last_output = sig;
      have_output = true;

      if(InpShowNoTradeMarker && is_closed_bar && !sig.is_final_signal && sig.direction == OTC_DIR_NONE)
         BufNoTrade[i] = low[i] - sig.atr_value * InpArrowAtrDistanceMult;

      if(is_closed_bar)
        {
         if(IsWithinNewsWindow(time[i]))
           {
            sig.is_final_signal = false;
            sig.blocking_filter = "High-impact news window";
           }

         if(sig.is_final_signal)
           {
            DrawArrow(sig.direction, time[i], high[i], low[i], sig.atr_value, i, BufCall, BufPut);
            if(InpShowConfidenceLabel)
              {
               double label_price = (sig.direction == OTC_DIR_CALL) ? (low[i] - sig.atr_value * InpArrowAtrDistanceMult)
                                                                       : (high[i] + sig.atr_value * InpArrowAtrDistanceMult);
               DrawConfidenceLabel(time[i], label_price, sig.direction, sig.confidence, ExpiryLabel());
              }

            g_engine.RegisterConfirmedSignal(time[i]);
            QueuePendingSignal(sig, i);
            g_last_signal_dir_text = (sig.direction == OTC_DIR_CALL) ? "CALL" : "PUT";
            FireAlert(sig, g_last_signal_dir_text);

            if(InpDebugLogging)
               PrintFormat("OTCPrecisionIndicator: FINAL %s signal at %s price=%s conf=%.1f modules=%d",
                           g_last_signal_dir_text, TimeToString(time[i]), DoubleToString(sig.entry_price, _Digits),
                           sig.confidence, sig.modules_agreeing);
           }

         g_engine.MarkBarProcessed(time[i]);
         SettlePending(i, time[i], close[i]);
        }
     }

   //--- feed staleness check based on the most recent bar time
   string feed_status = "LIVE";
   if(rates_total > 0)
     {
      datetime last_bar_time = time[rates_total - 1];
      long minutes_since = (long)((TimeCurrent() - last_bar_time) / 60);
      if(minutes_since > InpStaleFeedMinutes)
         feed_status = "STALE";
     }

   if(have_output)
      UpdateDashboard(last_output, feed_status);

   return(rates_total);
  }
//+------------------------------------------------------------------+
