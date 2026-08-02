//+------------------------------------------------------------------+
//|                                                SignalEngine.mqh  |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Modular weighted confluence CALL/PUT signal engine shared by     |
//| OTCPrecisionIndicator.mq5 and OTCSignalTesterEA.mq5. The engine  |
//| only ever evaluates fully closed candles (shift >= 1). It never  |
//| reads a bar that has not finished forming, so it cannot repaint  |
//| and cannot leak future information into a historical signal.    |
//|                                                                    |
//| The 85-confidence default is a SCORING THRESHOLD, not a          |
//| promised or displayed win rate. Actual win rate is only ever     |
//| taken from CSignalStatistics, which measures real settled        |
//| outcomes.                                                        |
//+------------------------------------------------------------------+
#property strict

#include <OTCPrecision/MarketRegime.mqh>

//--- Signal engine operating modes
enum ENUM_ENGINE_MODE
  {
   ENGINE_MODE_CONSERVATIVE = 0,
   ENGINE_MODE_BALANCED,
   ENGINE_MODE_AGGRESSIVE,
   ENGINE_MODE_CUSTOM
  };

//--- Direction constants
#define OTC_DIR_NONE  0
#define OTC_DIR_CALL  1
#define OTC_DIR_PUT  -1

//+------------------------------------------------------------------+
//| Full configuration for one CSignalEngine instance. Both the      |
//| indicator and the tester EA build this struct from their own     |
//| (identically named/valued) input blocks and pass it to the same |
//| engine implementation, guaranteeing identical signal logic.     |
//+------------------------------------------------------------------+
struct SEngineSettings
  {
   ENUM_ENGINE_MODE  mode;

   //--- confidence scoring
   double            min_confidence;              // e.g. 85.0 - a threshold, not a win-rate promise
   int               min_modules_agreeing;         // out of 8 quality checks
   bool              require_htf_confirmation;
   bool              require_structure_confirmation;
   bool              require_price_action_confirmation;
   bool              block_near_sr;
   bool              block_abnormal_volatility;
   int               min_cooldown_candles;

   //--- trend
   int               ema_fast_period;               // 20
   int               ema_mid_period;                // 50
   int               ema_slow_period;                // 200
   int               ema_slope_lookback;

   //--- momentum
   int               rsi_period;
   int               stoch_k_period;
   int               stoch_d_period;
   int               stoch_slowing;
   int               macd_fast_period;
   int               macd_slow_period;
   int               macd_signal_period;
   int               roc_period;

   //--- structure
   int               swing_lookback;                 // fractal arm length
   int               structure_search_bars;           // how far back to search for swing points

   //--- volatility
   int               atr_period;
   int               bb_period;
   double            bb_deviation;
   double            min_body_atr_ratio;              // reject candles smaller than this * ATR
   double            max_atr_spike_ratio;             // reject when ATR/avgATR exceeds this
   int               volatility_percentile_lookback;
   double            high_vol_percentile;
   double            low_vol_percentile;

   //--- support / resistance
   int               sr_swing_lookback;
   double            sr_atr_distance_mult;
   bool              use_prev_day_levels;
   bool              use_prev_session_levels;
   bool              use_round_levels;
   double            round_level_step;

   //--- liquidity
   int               liquidity_lookback;
   double            liquidity_sweep_atr_mult;

   //--- multi-timeframe
   ENUM_TIMEFRAMES   confirm_timeframe;
   ENUM_TIMEFRAMES   trend_timeframe;

   //--- module weights (need not sum to 100 - engine normalizes)
   double            weight_structure;
   double            weight_trend;
   double            weight_momentum;
   double            weight_price_action;
   double            weight_sr;
   double            weight_liquidity;
   double            weight_mtf;

   //--- no-trade filters
   double            max_spread_points;
   double            max_data_gap_multiplier;         // gap > multiplier * expected period -> block
   int               min_history_bars;
   double            adx_trend_threshold;
   int               adx_period;

   //--- constructor with sane conservative-leaning defaults
                     SEngineSettings(void)
     {
      mode                                = ENGINE_MODE_CONSERVATIVE;
      min_confidence                      = 85.0;
      min_modules_agreeing                = 6;
      require_htf_confirmation            = true;
      require_structure_confirmation      = true;
      require_price_action_confirmation   = true;
      block_near_sr                       = true;
      block_abnormal_volatility           = true;
      min_cooldown_candles                = 3;

      ema_fast_period    = 20;
      ema_mid_period     = 50;
      ema_slow_period    = 200;
      ema_slope_lookback = 5;

      rsi_period          = 14;
      stoch_k_period       = 5;
      stoch_d_period       = 3;
      stoch_slowing        = 3;
      macd_fast_period     = 12;
      macd_slow_period     = 26;
      macd_signal_period   = 9;
      roc_period           = 10;

      swing_lookback         = 3;
      structure_search_bars  = 80;

      atr_period                      = 14;
      bb_period                       = 20;
      bb_deviation                    = 2.0;
      min_body_atr_ratio              = 0.15;
      max_atr_spike_ratio             = 2.5;
      volatility_percentile_lookback  = 100;
      high_vol_percentile             = 90.0;
      low_vol_percentile              = 10.0;

      sr_swing_lookback        = 20;
      sr_atr_distance_mult     = 0.5;
      use_prev_day_levels      = true;
      use_prev_session_levels  = true;
      use_round_levels         = true;
      round_level_step         = 0.0010;

      liquidity_lookback         = 15;
      liquidity_sweep_atr_mult   = 0.25;

      confirm_timeframe = PERIOD_M5;
      trend_timeframe   = PERIOD_M15;

      weight_structure    = 15.0;
      weight_trend        = 20.0;
      weight_momentum     = 15.0;
      weight_price_action = 15.0;
      weight_sr           = 10.0;
      weight_liquidity    = 10.0;
      weight_mtf          = 15.0;

      max_spread_points        = 25.0;
      max_data_gap_multiplier  = 3.0;
      min_history_bars         = 250;
      adx_trend_threshold      = 22.0;
      adx_period               = 14;
     }
  };

//+------------------------------------------------------------------+
//| Result of evaluating a single closed candle                      |
//+------------------------------------------------------------------+
struct SEngineOutput
  {
   bool               data_ready;
   int                direction;             // OTC_DIR_CALL / OTC_DIR_PUT / OTC_DIR_NONE (candidate)
   double             call_score;
   double             put_score;
   double             confidence;
   int                modules_agreeing;
   bool               is_final_signal;
   string             blocking_filter;
   ENUM_MARKET_REGIME regime;
   double             atr_value;
   double             atr_percentile;
   int                trend_entry;           // -1/0/1
   int                trend_confirm;         // -1/0/1
   int                trend_trend;           // -1/0/1
   double             entry_price;
   datetime           bar_time;
  };

//+------------------------------------------------------------------+
//| CSignalEngine                                                     |
//+------------------------------------------------------------------+
class CSignalEngine
  {
private:
   string             m_symbol;
   ENUM_TIMEFRAMES    m_entry_tf;
   SEngineSettings    m_cfg;

   //--- indicator handles (entry timeframe) - cached, created once
   int                m_h_ema_fast;
   int                m_h_ema_mid;
   int                m_h_ema_slow;
   int                m_h_rsi;
   int                m_h_stoch;
   int                m_h_macd;
   int                m_h_atr;
   int                m_h_bands;

   //--- confirm / trend timeframe handles
   int                m_h_ema_fast_confirm;
   int                m_h_ema_mid_confirm;
   int                m_h_ema_fast_trend;
   int                m_h_ema_mid_trend;

   CMarketRegime      m_regime;

   //--- cooldown / duplicate protection state
   datetime           m_last_signal_bar_time;
   datetime           m_last_processed_bar_time;
   int                m_bars_since_last_signal;

   bool               m_handles_ready;

   //--- internal analysis helpers (all operate only on shift >= given shift, i.e. closed bars)
   bool               GetTrendDirection(const int handle_fast, const int handle_slow, const int shift, int &direction) const;
   bool               AnalyzeStructure(const int shift, double &bull, double &bear, bool &bos_bull, bool &bos_bear) const;
   bool               AnalyzeTrend(const int shift, double &bull, double &bear, int &trend_dir) const;
   bool               AnalyzeMomentum(const int shift, double &bull, double &bear, bool &strong_opposite_call, bool &strong_opposite_put) const;
   bool               AnalyzeVolatility(const int shift, double &atr_value, double &atr_percentile,
                                         bool &abnormal_small, bool &abnormal_spike) const;
   bool               AnalyzePriceAction(const int shift, double &bull, double &bear) const;
   bool               AnalyzeSR(const int shift, double &bull, double &bear, bool &block_call, bool &block_put) const;
   bool               AnalyzeLiquidity(const int shift, double &bull, double &bear) const;
   bool               AnalyzeMTF(const int shift, int &confirm_dir, int &trend_dir) const;

   bool               IsSwingHigh(const double &high[], const int idx, const int arm, const int max_idx) const;
   bool               IsSwingLow(const double &low[], const int idx, const int arm, const int max_idx) const;
   double             RoundLevelDistance(const double price) const;

public:
                      CSignalEngine(void);
                     ~CSignalEngine(void);

   bool               Init(const string symbol, const ENUM_TIMEFRAMES entry_tf, const SEngineSettings &settings);
   void               Deinit(void);
   void               ApplySettings(const SEngineSettings &settings) { m_cfg = settings; }
   SEngineSettings    GetSettings(void) const { return(m_cfg); }

   //--- main evaluation entry point - shift must be >= 1 (closed bar) for final signals
   SEngineOutput      Evaluate(const int shift);

   void               RegisterConfirmedSignal(const datetime bar_time);
   bool               IsDuplicateBar(const datetime bar_time) const { return(bar_time == m_last_processed_bar_time); }
   void               MarkBarProcessed(const datetime bar_time) { m_last_processed_bar_time = bar_time; }

   //--- shared, non-repainting outcome classification used by both indicator and tester EA
   static int         EvaluateOutcome(const int direction, const double entry_price, const double exit_price);
  };

//+------------------------------------------------------------------+
CSignalEngine::CSignalEngine(void)
  {
   m_symbol   = "";
   m_entry_tf = PERIOD_CURRENT;

   m_h_ema_fast = INVALID_HANDLE;
   m_h_ema_mid  = INVALID_HANDLE;
   m_h_ema_slow = INVALID_HANDLE;
   m_h_rsi      = INVALID_HANDLE;
   m_h_stoch    = INVALID_HANDLE;
   m_h_macd     = INVALID_HANDLE;
   m_h_atr      = INVALID_HANDLE;
   m_h_bands    = INVALID_HANDLE;

   m_h_ema_fast_confirm = INVALID_HANDLE;
   m_h_ema_mid_confirm  = INVALID_HANDLE;
   m_h_ema_fast_trend   = INVALID_HANDLE;
   m_h_ema_mid_trend    = INVALID_HANDLE;

   m_last_signal_bar_time    = 0;
   m_last_processed_bar_time = 0;
   m_bars_since_last_signal  = 1000000;
   m_handles_ready           = false;
  }

//+------------------------------------------------------------------+
CSignalEngine::~CSignalEngine(void)
  {
   Deinit();
  }

//+------------------------------------------------------------------+
bool CSignalEngine::Init(const string symbol, const ENUM_TIMEFRAMES entry_tf, const SEngineSettings &settings)
  {
   m_symbol   = symbol;
   m_entry_tf = entry_tf;
   m_cfg      = settings;

   m_h_ema_fast = iMA(m_symbol, m_entry_tf, m_cfg.ema_fast_period, 0, MODE_EMA, PRICE_CLOSE);
   m_h_ema_mid  = iMA(m_symbol, m_entry_tf, m_cfg.ema_mid_period,  0, MODE_EMA, PRICE_CLOSE);
   m_h_ema_slow = iMA(m_symbol, m_entry_tf, m_cfg.ema_slow_period, 0, MODE_EMA, PRICE_CLOSE);
   m_h_rsi      = iRSI(m_symbol, m_entry_tf, m_cfg.rsi_period, PRICE_CLOSE);
   m_h_stoch    = iStochastic(m_symbol, m_entry_tf, m_cfg.stoch_k_period, m_cfg.stoch_d_period,
                               m_cfg.stoch_slowing, MODE_SMA, STO_LOWHIGH);
   m_h_macd     = iMACD(m_symbol, m_entry_tf, m_cfg.macd_fast_period, m_cfg.macd_slow_period,
                         m_cfg.macd_signal_period, PRICE_CLOSE);
   m_h_atr      = iATR(m_symbol, m_entry_tf, m_cfg.atr_period);
   m_h_bands    = iBands(m_symbol, m_entry_tf, m_cfg.bb_period, 0, m_cfg.bb_deviation, PRICE_CLOSE);

   m_h_ema_fast_confirm = iMA(m_symbol, m_cfg.confirm_timeframe, m_cfg.ema_fast_period, 0, MODE_EMA, PRICE_CLOSE);
   m_h_ema_mid_confirm  = iMA(m_symbol, m_cfg.confirm_timeframe, m_cfg.ema_mid_period,  0, MODE_EMA, PRICE_CLOSE);
   m_h_ema_fast_trend   = iMA(m_symbol, m_cfg.trend_timeframe, m_cfg.ema_fast_period, 0, MODE_EMA, PRICE_CLOSE);
   m_h_ema_mid_trend    = iMA(m_symbol, m_cfg.trend_timeframe, m_cfg.ema_mid_period,  0, MODE_EMA, PRICE_CLOSE);

   if(m_h_ema_fast == INVALID_HANDLE || m_h_ema_mid == INVALID_HANDLE || m_h_ema_slow == INVALID_HANDLE ||
      m_h_rsi == INVALID_HANDLE || m_h_stoch == INVALID_HANDLE || m_h_macd == INVALID_HANDLE ||
      m_h_atr == INVALID_HANDLE || m_h_bands == INVALID_HANDLE ||
      m_h_ema_fast_confirm == INVALID_HANDLE || m_h_ema_mid_confirm == INVALID_HANDLE ||
      m_h_ema_fast_trend == INVALID_HANDLE || m_h_ema_mid_trend == INVALID_HANDLE)
     {
      PrintFormat("CSignalEngine::Init: failed to create one or more indicator handles for %s (err=%d)",
                  m_symbol, GetLastError());
      m_handles_ready = false;
      return(false);
     }

   if(!m_regime.Init(m_symbol, m_entry_tf, m_cfg.atr_period, m_cfg.adx_period,
                      m_cfg.volatility_percentile_lookback, m_cfg.high_vol_percentile,
                      m_cfg.low_vol_percentile, m_cfg.adx_trend_threshold))
     {
      m_handles_ready = false;
      return(false);
     }

   m_handles_ready = true;
   return(true);
  }

//+------------------------------------------------------------------+
void CSignalEngine::Deinit(void)
  {
   int handles[] = {m_h_ema_fast, m_h_ema_mid, m_h_ema_slow, m_h_rsi, m_h_stoch, m_h_macd, m_h_atr, m_h_bands,
                     m_h_ema_fast_confirm, m_h_ema_mid_confirm, m_h_ema_fast_trend, m_h_ema_mid_trend};
   for(int i = 0; i < ArraySize(handles); i++)
     {
      if(handles[i] != INVALID_HANDLE)
         IndicatorRelease(handles[i]);
     }
   m_h_ema_fast = m_h_ema_mid = m_h_ema_slow = INVALID_HANDLE;
   m_h_rsi = m_h_stoch = m_h_macd = m_h_atr = m_h_bands = INVALID_HANDLE;
   m_h_ema_fast_confirm = m_h_ema_mid_confirm = m_h_ema_fast_trend = m_h_ema_mid_trend = INVALID_HANDLE;
   m_regime.Deinit();
   m_handles_ready = false;
  }

//+------------------------------------------------------------------+
void CSignalEngine::RegisterConfirmedSignal(const datetime bar_time)
  {
   m_last_signal_bar_time   = bar_time;
   m_bars_since_last_signal = 0;
  }

//+------------------------------------------------------------------+
bool CSignalEngine::IsSwingHigh(const double &high[], const int idx, const int arm, const int max_idx) const
  {
   if(idx - arm < 0 || idx + arm > max_idx)
      return(false);
   for(int i = 1; i <= arm; i++)
     {
      if(high[idx] <= high[idx - i]) return(false);
      if(high[idx] <= high[idx + i]) return(false);
     }
   return(true);
  }

//+------------------------------------------------------------------+
bool CSignalEngine::IsSwingLow(const double &low[], const int idx, const int arm, const int max_idx) const
  {
   if(idx - arm < 0 || idx + arm > max_idx)
      return(false);
   for(int i = 1; i <= arm; i++)
     {
      if(low[idx] >= low[idx - i]) return(false);
      if(low[idx] >= low[idx + i]) return(false);
     }
   return(true);
  }

//+------------------------------------------------------------------+
//| Market structure: HH/HL vs LH/LL, break of structure (BOS) and   |
//| change of character (CHOCH). All swing points scanned are at    |
//| index >= shift, i.e. fully closed relative to the evaluation bar.|
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzeStructure(const int shift, double &bull, double &bear, bool &bos_bull, bool &bos_bear) const
  {
   bull = 0.0; bear = 0.0; bos_bull = false; bos_bear = false;

   int arm = MathMax(1, m_cfg.swing_lookback);
   int search = m_cfg.structure_search_bars;
   int need = shift + search + arm + 2;

   double high[], low[], close[];
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);
   if(CopyHigh(m_symbol, m_entry_tf, 0, need, high) < need) return(false);
   if(CopyLow(m_symbol, m_entry_tf, 0, need, low) < need) return(false);
   if(CopyClose(m_symbol, m_entry_tf, 0, need, close) < need) return(false);

   int max_idx = need - 1;

   //--- collect the most recent two confirmed swing highs / lows (index >= shift)
   double swingHighs[2]; int nHigh = 0;
   double swingLows[2];  int nLow = 0;

   for(int idx = shift + arm; idx <= shift + search && nHigh < 2 && idx <= max_idx - arm; idx++)
     {
      if(IsSwingHigh(high, idx, arm, max_idx))
        {
         swingHighs[nHigh] = high[idx];
         nHigh++;
        }
     }
   for(int idx = shift + arm; idx <= shift + search && nLow < 2 && idx <= max_idx - arm; idx++)
     {
      if(IsSwingLow(low, idx, arm, max_idx))
        {
         swingLows[nLow] = low[idx];
         nLow++;
        }
     }

   bool bullish_structure = false;
   bool bearish_structure = false;

   if(nHigh == 2 && nLow == 2)
     {
      //--- swingHighs[0] / swingLows[0] are the most recent (smallest index)
      bool higher_high = swingHighs[0] > swingHighs[1];
      bool higher_low  = swingLows[0]  > swingLows[1];
      bool lower_high   = swingHighs[0] < swingHighs[1];
      bool lower_low    = swingLows[0]  < swingLows[1];

      if(higher_high && higher_low)
        {
         bullish_structure = true;
         bull += 0.6;
        }
      else if(lower_high && lower_low)
        {
         bearish_structure = true;
         bear += 0.6;
        }
     }

   //--- break of structure: current close beyond the most recent confirmed swing high/low
   if(nHigh >= 1 && close[shift] > swingHighs[0])
     {
      bos_bull = true;
      bull += 0.4;
      if(bearish_structure)
         bull += 0.2; // change of character bonus - reversal off prior bearish structure
     }
   if(nLow >= 1 && close[shift] < swingLows[0])
     {
      bos_bear = true;
      bear += 0.4;
      if(bullish_structure)
         bear += 0.2; // change of character bonus - reversal off prior bullish structure
     }

   bull = MathMin(1.0, bull);
   bear = MathMin(1.0, bear);
   return(true);
  }

//+------------------------------------------------------------------+
bool CSignalEngine::GetTrendDirection(const int handle_fast, const int handle_slow, const int shift, int &direction) const
  {
   direction = 0;
   double fast_buf[], slow_buf[];
   ArraySetAsSeries(fast_buf, true);
   ArraySetAsSeries(slow_buf, true);
   if(CopyBuffer(handle_fast, 0, shift, 1, fast_buf) < 1) return(false);
   if(CopyBuffer(handle_slow, 0, shift, 1, slow_buf) < 1) return(false);
   if(fast_buf[0] > slow_buf[0]) direction = 1;
   else if(fast_buf[0] < slow_buf[0]) direction = -1;
   return(true);
  }

//+------------------------------------------------------------------+
//| Trend module: EMA stack, slope, price position, entry-TF trend   |
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzeTrend(const int shift, double &bull, double &bear, int &trend_dir) const
  {
   bull = 0.0; bear = 0.0; trend_dir = 0;

   int need = shift + m_cfg.ema_slope_lookback + 2;
   double ema_fast[], ema_mid[], ema_slow[], close[];
   ArraySetAsSeries(ema_fast, true);
   ArraySetAsSeries(ema_mid, true);
   ArraySetAsSeries(ema_slow, true);
   ArraySetAsSeries(close, true);

   if(CopyBuffer(m_h_ema_fast, 0, shift, need - shift, ema_fast) < need - shift) return(false);
   if(CopyBuffer(m_h_ema_mid,  0, shift, need - shift, ema_mid)  < need - shift) return(false);
   if(CopyBuffer(m_h_ema_slow, 0, shift, 1, ema_slow) < 1) return(false);
   if(CopyClose(m_symbol, m_entry_tf, shift, 1, close) < 1) return(false);

   double f0 = ema_fast[0], m0 = ema_mid[0], s0 = ema_slow[0], c0 = close[0];

   bool stacked_bull = (c0 > f0 && f0 > m0 && m0 > s0);
   bool stacked_bear = (c0 < f0 && f0 < m0 && m0 < s0);

   if(stacked_bull) bull += 0.5;
   if(stacked_bear) bear += 0.5;

   //--- EMA slope over lookback (fast EMA)
   int last_idx = MathMin(ArraySize(ema_fast) - 1, m_cfg.ema_slope_lookback);
   double slope = ema_fast[0] - ema_fast[last_idx];
   if(slope > 0) bull += 0.25;
   if(slope < 0) bear += 0.25;

   //--- price position relative to averages
   int above = 0, below = 0;
   if(c0 > f0) above++; else if(c0 < f0) below++;
   if(c0 > m0) above++; else if(c0 < m0) below++;
   if(c0 > s0) above++; else if(c0 < s0) below++;
   bull += 0.25 * ((double)above / 3.0);
   bear += 0.25 * ((double)below / 3.0);

   if(f0 > m0) trend_dir = 1;
   else if(f0 < m0) trend_dir = -1;

   bull = MathMin(1.0, bull);
   bear = MathMin(1.0, bear);
   return(true);
  }

//+------------------------------------------------------------------+
//| Momentum module: RSI, Stochastic, MACD histogram, ROC and a      |
//| non-repainting weakening-momentum / divergence check.            |
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzeMomentum(const int shift, double &bull, double &bear,
                                     bool &strong_opposite_call, bool &strong_opposite_put) const
  {
   bull = 0.0; bear = 0.0; strong_opposite_call = false; strong_opposite_put = false;

   int divergence_lookback = 5;
   int copy_count = divergence_lookback + 2;

   double rsi[], macd_main[], macd_signal[], stoch_k[], stoch_d[], close[];
   ArraySetAsSeries(rsi, true);
   ArraySetAsSeries(macd_main, true);
   ArraySetAsSeries(macd_signal, true);
   ArraySetAsSeries(stoch_k, true);
   ArraySetAsSeries(stoch_d, true);
   ArraySetAsSeries(close, true);

   if(CopyBuffer(m_h_rsi, 0, shift, copy_count, rsi) < copy_count) return(false);
   if(CopyBuffer(m_h_macd, 0, shift, copy_count, macd_main) < copy_count) return(false);
   if(CopyBuffer(m_h_macd, 1, shift, copy_count, macd_signal) < copy_count) return(false);
   if(CopyBuffer(m_h_stoch, 0, shift, 2, stoch_k) < 2) return(false);
   if(CopyBuffer(m_h_stoch, 1, shift, 2, stoch_d) < 2) return(false);
   if(CopyClose(m_symbol, m_entry_tf, shift, copy_count, close) < copy_count) return(false);

   //--- RSI
   if(rsi[0] > 50.0) bull += 0.25;
   if(rsi[0] < 50.0) bear += 0.25;
   if(rsi[0] >= 75.0) strong_opposite_call = true;  // too extended to chase a fresh CALL
   if(rsi[0] <= 25.0) strong_opposite_put  = true;  // too extended to chase a fresh PUT

   //--- Stochastic cross
   if(stoch_k[0] > stoch_d[0] && stoch_k[1] <= stoch_d[1]) bull += 0.20;
   if(stoch_k[0] < stoch_d[0] && stoch_k[1] >= stoch_d[1]) bear += 0.20;
   if(stoch_k[0] > 50.0) bull += 0.05;
   if(stoch_k[0] < 50.0) bear += 0.05;

   //--- MACD histogram direction
   double hist0 = macd_main[0] - macd_signal[0];
   double hist1 = macd_main[1] - macd_signal[1];
   if(hist0 > 0 && hist0 > hist1) bull += 0.25;
   if(hist0 < 0 && hist0 < hist1) bear += 0.25;

   //--- Rate of change
   int roc_shift = MathMin(m_cfg.roc_period, copy_count - 1);
   if(close[roc_shift] != 0.0)
     {
      double roc = (close[0] - close[roc_shift]) / close[roc_shift] * 100.0;
      if(roc > 0) bull += 0.15;
      if(roc < 0) bear += 0.15;
     }

   //--- Weakening momentum / simple bearish-bullish divergence check (non-repainting: uses only closed bars)
   int older = MathMin(divergence_lookback, copy_count - 1);
   bool price_higher_high = close[0] > close[older];
   bool rsi_lower_high    = rsi[0] < rsi[older];
   bool price_lower_low   = close[0] < close[older];
   bool rsi_higher_low    = rsi[0] > rsi[older];

   if(price_higher_high && rsi_lower_high)
      bear += 0.10; // bearish divergence -> weakening upside momentum
   if(price_lower_low && rsi_higher_low)
      bull += 0.10; // bullish divergence -> weakening downside momentum

   bull = MathMin(1.0, bull);
   bear = MathMin(1.0, bear);
   return(true);
  }

//+------------------------------------------------------------------+
//| Volatility module: ATR, Bollinger width, abnormal small/spike    |
//| candle detection and percentile filtering (via CMarketRegime).   |
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzeVolatility(const int shift, double &atr_value, double &atr_percentile,
                                       bool &abnormal_small, bool &abnormal_spike) const
  {
   atr_value = 0.0; atr_percentile = 50.0; abnormal_small = false; abnormal_spike = false;

   int need = MathMax(20, m_cfg.atr_period) + shift + 2;
   double atr_buf[], high[], low[], open[], close[];
   ArraySetAsSeries(atr_buf, true);
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(open, true);
   ArraySetAsSeries(close, true);

   if(CopyBuffer(m_h_atr, 0, shift, need - shift, atr_buf) < need - shift) return(false);
   if(CopyHigh(m_symbol, m_entry_tf, shift, 1, high) < 1) return(false);
   if(CopyLow(m_symbol, m_entry_tf, shift, 1, low) < 1) return(false);
   if(CopyOpen(m_symbol, m_entry_tf, shift, 1, open) < 1) return(false);
   if(CopyClose(m_symbol, m_entry_tf, shift, 1, close) < 1) return(false);

   atr_value = atr_buf[0];
   if(atr_value <= 0.0)
      return(false);

   //--- average ATR over the copied window (excluding current) for spike detection
   double sum = 0.0; int cnt = 0;
   for(int i = 1; i < ArraySize(atr_buf); i++)
     {
      sum += atr_buf[i];
      cnt++;
     }
   double avg_atr = (cnt > 0) ? sum / cnt : atr_value;
   if(avg_atr > 0.0 && (atr_value / avg_atr) >= m_cfg.max_atr_spike_ratio)
      abnormal_spike = true;

   double body = MathAbs(close[0] - open[0]);
   if(body < m_cfg.min_body_atr_ratio * atr_value)
      abnormal_small = true;

   //--- Bollinger Band width squeeze check (confirms compression alongside ATR)
   int bb_need = MathMax(20, m_cfg.bb_period) + shift + 2;
   double upper[], lower[];
   ArraySetAsSeries(upper, true);
   ArraySetAsSeries(lower, true);
   if(CopyBuffer(m_h_bands, 1, shift, bb_need - shift, upper) >= bb_need - shift &&
      CopyBuffer(m_h_bands, 2, shift, bb_need - shift, lower) >= bb_need - shift)
     {
      int n = ArraySize(upper);
      double width_sum = 0.0; int width_cnt = 0;
      double width_current = 0.0;
      for(int i = 0; i < n; i++)
        {
         double w = upper[i] - lower[i];
         if(i == 0)
            width_current = w;
         else
           {
            width_sum += w;
            width_cnt++;
           }
        }
      double avg_width = (width_cnt > 0) ? width_sum / width_cnt : width_current;
      if(avg_width > 0.0 && width_current < avg_width * m_cfg.min_body_atr_ratio * 2.0)
         abnormal_small = true;
     }

   return(true);
  }

//+------------------------------------------------------------------+
//| Price action module: engulfing, pin bar, rejection, inside-bar   |
//| breakout, momentum candle, three-candle reversal, body/wick      |
//| ratios. Uses only the closed candle at "shift" and its already-  |
//| closed predecessors.                                             |
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzePriceAction(const int shift, double &bull, double &bear) const
  {
   bull = 0.0; bear = 0.0;

   double open[], high[], low[], close[];
   ArraySetAsSeries(open, true);
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);

   if(CopyOpen(m_symbol, m_entry_tf, shift, 4, open) < 4) return(false);
   if(CopyHigh(m_symbol, m_entry_tf, shift, 4, high) < 4) return(false);
   if(CopyLow(m_symbol, m_entry_tf, shift, 4, low) < 4) return(false);
   if(CopyClose(m_symbol, m_entry_tf, shift, 4, close) < 4) return(false);

   //--- index 0 = current signal candle (shift), 1 = previous, 2 = two back, 3 = three back
   double range0 = high[0] - low[0];
   if(range0 <= 0.0) return(false);
   double body0 = MathAbs(close[0] - open[0]);
   double upper_wick = high[0] - MathMax(open[0], close[0]);
   double lower_wick = MathMin(open[0], close[0]) - low[0];
   double body_ratio  = body0 / range0;
   double upper_ratio = upper_wick / range0;
   double lower_ratio = lower_wick / range0;
   bool bullish_candle = close[0] > open[0];
   bool bearish_candle = close[0] < open[0];

   //--- engulfing
   double body1 = MathAbs(close[1] - open[1]);
   bool bull_engulf = bullish_candle && (close[1] < open[1]) &&
                       (close[0] >= open[1]) && (open[0] <= close[1]) && (body0 > body1);
   bool bear_engulf = bearish_candle && (close[1] > open[1]) &&
                       (open[0] >= close[1]) && (close[0] <= open[1]) && (body0 > body1);
   if(bull_engulf) bull += 0.25;
   if(bear_engulf) bear += 0.25;

   //--- pin bar / rejection candle (long wick opposite the close, small body)
   bool bullish_pin = (lower_ratio >= 0.55) && (body_ratio <= 0.35) && (upper_ratio <= 0.20);
   bool bearish_pin = (upper_ratio >= 0.55) && (body_ratio <= 0.35) && (lower_ratio <= 0.20);
   if(bullish_pin) bull += 0.20;
   if(bearish_pin) bear += 0.20;

   //--- inside-bar breakout: candle 1 was an inside bar relative to candle 2, candle 0 breaks out
   bool inside_bar = (high[1] <= high[2]) && (low[1] >= low[2]);
   if(inside_bar && close[0] > high[2]) bull += 0.15;
   if(inside_bar && close[0] < low[2])  bear += 0.15;

   //--- momentum candle: large body relative to range and relative to prior candle
   if(bullish_candle && body_ratio >= 0.65 && body0 > body1) bull += 0.15;
   if(bearish_candle && body_ratio >= 0.65 && body0 > body1) bear += 0.15;

   //--- three-candle reversal pattern
   bool three_bull_reversal = (close[3] > open[3]) == false && (close[2] < open[2]) &&
                               (close[1] < close[2]) && bullish_candle && (close[0] > open[1]);
   bool three_bear_reversal = (close[3] < open[3]) == false && (close[2] > open[2]) &&
                               (close[1] > close[2]) && bearish_candle && (close[0] < open[1]);
   if(three_bull_reversal) bull += 0.15;
   if(three_bear_reversal) bear += 0.15;

   //--- body-to-range quality contribution (favors decisive candles over indecisive dojis)
   bull += (bullish_candle ? body_ratio * 0.10 : 0.0);
   bear += (bearish_candle ? body_ratio * 0.10 : 0.0);

   bull = MathMin(1.0, bull);
   bear = MathMin(1.0, bear);
   return(true);
  }

//+------------------------------------------------------------------+
double CSignalEngine::RoundLevelDistance(const double price) const
  {
   if(m_cfg.round_level_step <= 0.0)
      return(DBL_MAX);
   double nearest = MathRound(price / m_cfg.round_level_step) * m_cfg.round_level_step;
   return(MathAbs(price - nearest));
  }

//+------------------------------------------------------------------+
//| Support / resistance module. Blocks CALL directly below          |
//| resistance and PUT directly above support, using an ATR-based    |
//| proximity filter.                                                 |
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzeSR(const int shift, double &bull, double &bear, bool &block_call, bool &block_put) const
  {
   bull = 0.0; bear = 0.0; block_call = false; block_put = false;

   double atr_buf[];
   ArraySetAsSeries(atr_buf, true);
   if(CopyBuffer(m_h_atr, 0, shift, 1, atr_buf) < 1) return(false);
   double atr_value = atr_buf[0];
   if(atr_value <= 0.0) return(false);
   double proximity = atr_value * m_cfg.sr_atr_distance_mult;

   int need = m_cfg.sr_swing_lookback + shift + 2;
   double high[], low[], close[];
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);
   if(CopyHigh(m_symbol, m_entry_tf, 0, need, high) < need) return(false);
   if(CopyLow(m_symbol, m_entry_tf, 0, need, low) < need) return(false);
   if(CopyClose(m_symbol, m_entry_tf, shift, 1, close) < 1) return(false);

   double price = close[0];

   double nearest_resistance = DBL_MAX;
   double nearest_support    = DBL_MAX;

   //--- recent swing high/low levels
   double hh = high[ArrayMaximum(high, shift, m_cfg.sr_swing_lookback)];
   double ll = low[ArrayMinimum(low, shift, m_cfg.sr_swing_lookback)];
   if(hh > price) nearest_resistance = MathMin(nearest_resistance, hh - price);
   if(ll < price) nearest_support    = MathMin(nearest_support, price - ll);

   //--- previous day high/low
   if(m_cfg.use_prev_day_levels)
     {
      double day_high[], day_low[];
      ArraySetAsSeries(day_high, true);
      ArraySetAsSeries(day_low, true);
      if(CopyHigh(m_symbol, PERIOD_D1, 1, 1, day_high) == 1 && CopyLow(m_symbol, PERIOD_D1, 1, 1, day_low) == 1)
        {
         if(day_high[0] > price) nearest_resistance = MathMin(nearest_resistance, day_high[0] - price);
         if(day_low[0]  < price) nearest_support    = MathMin(nearest_support, price - day_low[0]);
        }
     }

   //--- previous session (approximated as previous H4 block) high/low
   if(m_cfg.use_prev_session_levels)
     {
      double sess_high[], sess_low[];
      ArraySetAsSeries(sess_high, true);
      ArraySetAsSeries(sess_low, true);
      if(CopyHigh(m_symbol, PERIOD_H4, 1, 1, sess_high) == 1 && CopyLow(m_symbol, PERIOD_H4, 1, 1, sess_low) == 1)
        {
         if(sess_high[0] > price) nearest_resistance = MathMin(nearest_resistance, sess_high[0] - price);
         if(sess_low[0]  < price) nearest_support    = MathMin(nearest_support, price - sess_low[0]);
        }
     }

   //--- psychological round level (equidistant, can act as either side)
   if(m_cfg.use_round_levels)
     {
      double d = RoundLevelDistance(price);
      nearest_resistance = MathMin(nearest_resistance, d);
      nearest_support    = MathMin(nearest_support, d);
     }

   if(nearest_resistance <= proximity)
     {
      block_call = true;
      bear += 0.3;
     }
   else
      bull += 0.3;

   if(nearest_support <= proximity)
     {
      block_put = true;
      bull += 0.3;
     }
   else
      bear += 0.3;

   bull = MathMin(1.0, bull);
   bear = MathMin(1.0, bear);
   return(true);
  }

//+------------------------------------------------------------------+
//| Liquidity module: sweep of a recent high/low followed by a close |
//| back inside the prior range (stop-hunt reversal pattern).        |
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzeLiquidity(const int shift, double &bull, double &bear) const
  {
   bull = 0.0; bear = 0.0;

   int lookback = m_cfg.liquidity_lookback;
   int need = lookback + shift + 3;
   double high[], low[], close[], open[];
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);
   ArraySetAsSeries(open, true);
   if(CopyHigh(m_symbol, m_entry_tf, 0, need, high) < need) return(false);
   if(CopyLow(m_symbol, m_entry_tf, 0, need, low) < need) return(false);
   if(CopyClose(m_symbol, m_entry_tf, 0, need, close) < need) return(false);
   if(CopyOpen(m_symbol, m_entry_tf, 0, need, open) < need) return(false);

   double atr_buf[];
   ArraySetAsSeries(atr_buf, true);
   if(CopyBuffer(m_h_atr, 0, shift, 1, atr_buf) < 1) return(false);
   double margin = atr_buf[0] * m_cfg.liquidity_sweep_atr_mult;

   //--- prior range high/low excluding the signal candle itself
   int prior_start = shift + 1;
   double prior_high = high[ArrayMaximum(high, prior_start, lookback)];
   double prior_low  = low[ArrayMinimum(low, prior_start, lookback)];

   bool swept_high = (high[shift] > prior_high + margin);
   bool swept_low  = (low[shift]  < prior_low  - margin);
   bool closed_back_inside_from_high = swept_high && (close[shift] < prior_high);
   bool closed_back_inside_from_low  = swept_low  && (close[shift] > prior_low);

   //--- rejection confirmation: candle closes in the direction opposite the sweep
   if(swept_high && closed_back_inside_from_high && close[shift] < open[shift])
      bear += 0.7; // liquidity grab above highs, rejected -> bearish
   if(swept_low && closed_back_inside_from_low && close[shift] > open[shift])
      bull += 0.7; // liquidity grab below lows, rejected -> bullish

   bull = MathMin(1.0, bull);
   bear = MathMin(1.0, bear);
   return(true);
  }

//+------------------------------------------------------------------+
//| Multi-timeframe module. Only ever reads the most recently CLOSED |
//| bar (index 1) of the confirmation / trend timeframes, which is   |
//| guaranteed to have finished before or at the entry-bar close.    |
//+------------------------------------------------------------------+
bool CSignalEngine::AnalyzeMTF(const int shift, int &confirm_dir, int &trend_dir) const
  {
   confirm_dir = 0; trend_dir = 0;
   int htf_shift = MathMax(1, shift);
   if(!GetTrendDirection(m_h_ema_fast_confirm, m_h_ema_mid_confirm, htf_shift, confirm_dir)) return(false);
   if(!GetTrendDirection(m_h_ema_fast_trend,   m_h_ema_mid_trend,   htf_shift, trend_dir))   return(false);
   return(true);
  }

//+------------------------------------------------------------------+
//| Shared, non-repainting settlement rule used by indicator + EA.   |
//| CALL wins when exit price > entry price; PUT wins when exit      |
//| price < entry price. Equal prices are DRAW, never a win.        |
//+------------------------------------------------------------------+
int CSignalEngine::EvaluateOutcome(const int direction, const double entry_price, const double exit_price)
  {
   if(exit_price == entry_price)
      return(0);  // DRAW
   if(direction == OTC_DIR_CALL)
      return(exit_price > entry_price ? 1 : -1);
   if(direction == OTC_DIR_PUT)
      return(exit_price < entry_price ? 1 : -1);
   return(0);
  }

//+------------------------------------------------------------------+
//| Main evaluation. Combines every module into weighted CALL / PUT  |
//| scores, applies all no-trade filters and returns whether a final,|
//| confirmed signal exists at this closed candle.                   |
//+------------------------------------------------------------------+
SEngineOutput CSignalEngine::Evaluate(const int shift)
  {
   SEngineOutput out;
   out.data_ready       = false;
   out.direction        = OTC_DIR_NONE;
   out.call_score        = 0.0;
   out.put_score         = 0.0;
   out.confidence         = 0.0;
   out.modules_agreeing   = 0;
   out.is_final_signal    = false;
   out.blocking_filter    = "";
   out.regime             = REGIME_UNSTABLE;
   out.atr_value           = 0.0;
   out.atr_percentile      = 50.0;
   out.trend_entry         = 0;
   out.trend_confirm       = 0;
   out.trend_trend         = 0;
   out.entry_price         = 0.0;
   out.bar_time            = 0;

   if(!m_handles_ready || shift < 0)
     {
      out.blocking_filter = "Engine not ready";
      return(out);
     }

   int bars = Bars(m_symbol, m_entry_tf);
   if(bars < m_cfg.min_history_bars)
     {
      out.blocking_filter = "Insufficient historical bars";
      return(out);
     }

   datetime bar_time[]; double open_price[], close_price[];
   ArraySetAsSeries(bar_time, true);
   ArraySetAsSeries(open_price, true);
   ArraySetAsSeries(close_price, true);
   if(CopyTime(m_symbol, m_entry_tf, 0, shift + 2, bar_time) < shift + 2)
     {
      out.blocking_filter = "Insufficient historical bars";
      return(out);
     }
   if(CopyOpen(m_symbol, m_entry_tf, shift, 1, open_price) < 1 ||
      CopyClose(m_symbol, m_entry_tf, shift, 1, close_price) < 1)
     {
      out.blocking_filter = "Data copy failed";
      return(out);
     }

   out.bar_time    = bar_time[shift];
   out.entry_price = close_price[0];

   //--- large data gap detection between this bar and the previous one
   long expected_seconds = PeriodSeconds(m_entry_tf);
   long actual_gap = (long)(bar_time[shift] - bar_time[shift + 1]);
   if(expected_seconds > 0 && actual_gap > expected_seconds * (long)m_cfg.max_data_gap_multiplier)
     {
      out.blocking_filter = "Large data gap detected";
      return(out);
     }

   //--- spread filter (only meaningful on the current/live bar context, still safe historically)
   double spread_points = (double)SymbolInfoInteger(m_symbol, SYMBOL_SPREAD);
   if(spread_points > m_cfg.max_spread_points)
     {
      out.blocking_filter = "Spread too wide";
      return(out);
     }

   //--- regime
   double atr_value = 0.0, atr_percentile = 50.0, adx_value = 0.0;
   ENUM_MARKET_REGIME regime = m_regime.Detect(shift, atr_value, atr_percentile, adx_value);
   out.regime = regime;
   out.atr_value = atr_value;
   out.atr_percentile = atr_percentile;
   if(regime == REGIME_UNSTABLE)
     {
      out.blocking_filter = "Unstable regime / insufficient data";
      return(out);
     }

   //--- run all modules
   double s_bull, s_bear; bool bos_bull, bos_bear;
   if(!AnalyzeStructure(shift, s_bull, s_bear, bos_bull, bos_bear))
     { out.blocking_filter = "Structure data unavailable"; return(out); }

   double t_bull, t_bear; int trend_dir;
   if(!AnalyzeTrend(shift, t_bull, t_bear, trend_dir))
     { out.blocking_filter = "Trend data unavailable"; return(out); }
   out.trend_entry = trend_dir;

   double mom_bull, mom_bear; bool opp_call, opp_put;
   if(!AnalyzeMomentum(shift, mom_bull, mom_bear, opp_call, opp_put))
     { out.blocking_filter = "Momentum data unavailable"; return(out); }

   double atr_v2, atr_p2; bool abnormal_small, abnormal_spike;
   if(!AnalyzeVolatility(shift, atr_v2, atr_p2, abnormal_small, abnormal_spike))
     { out.blocking_filter = "Volatility data unavailable"; return(out); }

   double pa_bull, pa_bear;
   if(!AnalyzePriceAction(shift, pa_bull, pa_bear))
     { out.blocking_filter = "Price action data unavailable"; return(out); }

   double sr_bull, sr_bear; bool sr_block_call, sr_block_put;
   if(!AnalyzeSR(shift, sr_bull, sr_bear, sr_block_call, sr_block_put))
     { out.blocking_filter = "S/R data unavailable"; return(out); }

   double liq_bull, liq_bear;
   if(!AnalyzeLiquidity(shift, liq_bull, liq_bear))
     { out.blocking_filter = "Liquidity data unavailable"; return(out); }

   int confirm_dir, trend_tf_dir;
   if(!AnalyzeMTF(shift, confirm_dir, trend_tf_dir))
     { out.blocking_filter = "MTF data unavailable"; return(out); }
   out.trend_confirm = confirm_dir;
   out.trend_trend   = trend_tf_dir;

   //--- weighted aggregation (MTF contribution derived from confirm+trend TF agreement)
   double mtf_bull = 0.0, mtf_bear = 0.0;
   if(confirm_dir > 0) mtf_bull += 0.5; if(confirm_dir < 0) mtf_bear += 0.5;
   if(trend_tf_dir > 0) mtf_bull += 0.5; if(trend_tf_dir < 0) mtf_bear += 0.5;

   double total_weight = m_cfg.weight_structure + m_cfg.weight_trend + m_cfg.weight_momentum +
                          m_cfg.weight_price_action + m_cfg.weight_sr + m_cfg.weight_liquidity + m_cfg.weight_mtf;
   if(total_weight <= 0.0) total_weight = 1.0;

   double call_score = (s_bull * m_cfg.weight_structure + t_bull * m_cfg.weight_trend +
                         mom_bull * m_cfg.weight_momentum + pa_bull * m_cfg.weight_price_action +
                         sr_bull * m_cfg.weight_sr + liq_bull * m_cfg.weight_liquidity +
                         mtf_bull * m_cfg.weight_mtf) / total_weight * 100.0;

   double put_score = (s_bear * m_cfg.weight_structure + t_bear * m_cfg.weight_trend +
                        mom_bear * m_cfg.weight_momentum + pa_bear * m_cfg.weight_price_action +
                        sr_bear * m_cfg.weight_sr + liq_bear * m_cfg.weight_liquidity +
                        mtf_bear * m_cfg.weight_mtf) / total_weight * 100.0;

   out.call_score = call_score;
   out.put_score  = put_score;

   int candidate_dir = OTC_DIR_NONE;
   double confidence = 0.0;
   if(call_score > put_score)
     { candidate_dir = OTC_DIR_CALL; confidence = call_score; }
   else if(put_score > call_score)
     { candidate_dir = OTC_DIR_PUT; confidence = put_score; }

   out.direction  = candidate_dir;
   out.confidence = confidence;

   if(candidate_dir == OTC_DIR_NONE)
     {
      out.blocking_filter = "No directional edge";
      return(out);
     }

   //--- 8 quality checks -> modules_agreeing
   bool q_trend      = (candidate_dir == OTC_DIR_CALL) ? (trend_dir >= 0 && t_bull >= t_bear) : (trend_dir <= 0 && t_bear >= t_bull);
   bool q_momentum    = (candidate_dir == OTC_DIR_CALL) ? (mom_bull >= mom_bear) : (mom_bear >= mom_bull);
   bool q_price_action= (candidate_dir == OTC_DIR_CALL) ? (pa_bull >= pa_bear && pa_bull > 0.0) : (pa_bear >= pa_bull && pa_bear > 0.0);
   bool q_structure   = (candidate_dir == OTC_DIR_CALL) ? (s_bull >= s_bear && s_bull > 0.0) : (s_bear >= s_bull && s_bear > 0.0);
   bool q_sr_safety   = (candidate_dir == OTC_DIR_CALL) ? !sr_block_call : !sr_block_put;
   bool q_volatility  = !abnormal_small && !abnormal_spike;
   bool q_htf         = (candidate_dir == OTC_DIR_CALL) ? (confirm_dir >= 0 && trend_tf_dir >= 0) : (confirm_dir <= 0 && trend_tf_dir <= 0);
   bool q_regime      = (regime == REGIME_TRENDING || regime == REGIME_RANGING);

   int agreeing = (q_trend?1:0) + (q_momentum?1:0) + (q_price_action?1:0) + (q_structure?1:0) +
                  (q_sr_safety?1:0) + (q_volatility?1:0) + (q_htf?1:0) + (q_regime?1:0);
   out.modules_agreeing = agreeing;

   //--- base data pipeline succeeded: scores/regime/trend fields are now valid for display
   //--- even if a no-trade filter below prevents this candidate from becoming a final signal
   out.data_ready = true;

   //--- no-trade filters (each may block regardless of score)
   if(m_cfg.block_abnormal_volatility && (abnormal_small || abnormal_spike))
     { out.blocking_filter = abnormal_spike ? "Extreme volatility spike" : "Compressed / abnormal candle"; return(out); }

   if(regime == REGIME_HIGH_VOLATILITY && m_cfg.block_abnormal_volatility)
     { out.blocking_filter = "High volatility regime"; return(out); }

   if(regime == REGIME_LOW_VOLATILITY && m_cfg.block_abnormal_volatility)
     { out.blocking_filter = "Low volatility / compressed market"; return(out); }

   if(m_cfg.require_htf_confirmation && !q_htf)
     { out.blocking_filter = "Conflicting higher-timeframe trend"; return(out); }

   if(m_cfg.block_near_sr && ((candidate_dir == OTC_DIR_CALL && sr_block_call) || (candidate_dir == OTC_DIR_PUT && sr_block_put)))
     { out.blocking_filter = "Price trapped near support/resistance"; return(out); }

   if(m_cfg.require_structure_confirmation && !q_structure)
     { out.blocking_filter = "No structure confirmation"; return(out); }

   if(m_cfg.require_price_action_confirmation && !q_price_action)
     { out.blocking_filter = "No price-action confirmation"; return(out); }

   if((candidate_dir == OTC_DIR_CALL && opp_call) || (candidate_dir == OTC_DIR_PUT && opp_put))
     { out.blocking_filter = "Strong opposite momentum (extended)"; return(out); }

   if(IsDuplicateBar(bar_time[shift]))
     { out.blocking_filter = "Duplicate candle already processed"; return(out); }

   if(m_bars_since_last_signal < m_cfg.min_cooldown_candles)
     { out.blocking_filter = "Cooldown period active"; return(out); }

   if(confidence < m_cfg.min_confidence)
     { out.blocking_filter = "Confidence below threshold"; return(out); }

   if(agreeing < m_cfg.min_modules_agreeing)
     { out.blocking_filter = "Insufficient module agreement"; return(out); }

   //--- a forming (not yet closed) candle can never produce a final, confirmed signal -
   //--- only a fully evaluated preview. This is what keeps preview and confirmed signals
   //--- strictly separated and prevents any possibility of repainting a confirmed arrow.
   if(shift < 1)
     {
      out.blocking_filter = "Preview (forming candle - not yet confirmed)";
      return(out);
     }

   //--- all gates passed on a fully closed candle - confirmed final signal
   out.is_final_signal = true;
   out.blocking_filter = "";
   return(out);
  }
//+------------------------------------------------------------------+
