//+------------------------------------------------------------------+
//|                                              MarketRegime.mqh    |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Classifies the current market condition into a discrete regime   |
//| using ATR-based volatility percentile ranking and ADX-based      |
//| trend-strength measurement. All calculations use only closed     |
//| bars (shift >= 1 by default) to avoid look-ahead / repainting.   |
//+------------------------------------------------------------------+
#property strict

//--- Market regime classification
enum ENUM_MARKET_REGIME
  {
   REGIME_TRENDING = 0,      // Directional movement, ADX above threshold
   REGIME_RANGING,           // Low directional strength, contained range
   REGIME_HIGH_VOLATILITY,   // ATR percentile extreme (spike)
   REGIME_LOW_VOLATILITY,    // ATR percentile compressed
   REGIME_UNSTABLE           // Insufficient / inconsistent data, no-trade
  };

//+------------------------------------------------------------------+
//| Convert regime enum to human readable string                    |
//+------------------------------------------------------------------+
string RegimeToString(const ENUM_MARKET_REGIME regime)
  {
   switch(regime)
     {
      case REGIME_TRENDING:        return("TRENDING");
      case REGIME_RANGING:         return("RANGING");
      case REGIME_HIGH_VOLATILITY: return("HIGH VOLATILITY");
      case REGIME_LOW_VOLATILITY:  return("LOW VOLATILITY");
      case REGIME_UNSTABLE:        return("UNSTABLE");
     }
   return("UNKNOWN");
  }

//+------------------------------------------------------------------+
//| CMarketRegime                                                    |
//| Detects the prevailing market regime for a given symbol/TF.      |
//+------------------------------------------------------------------+
class CMarketRegime
  {
private:
   string            m_symbol;
   ENUM_TIMEFRAMES   m_timeframe;
   int               m_atr_handle;
   int               m_adx_handle;
   int               m_atr_period;
   int               m_adx_period;
   int               m_percentile_lookback;
   double            m_high_vol_percentile;   // e.g. 90 -> top 10% of ATR readings
   double            m_low_vol_percentile;    // e.g. 10 -> bottom 10% of ATR readings
   double            m_adx_trend_threshold;   // e.g. 22
   bool              m_initialized;

public:
                     CMarketRegime(void);
                    ~CMarketRegime(void);

   bool              Init(const string symbol,
                           const ENUM_TIMEFRAMES timeframe,
                           const int atr_period,
                           const int adx_period,
                           const int percentile_lookback,
                           const double high_vol_percentile,
                           const double low_vol_percentile,
                           const double adx_trend_threshold);
   void              Deinit(void);

   ENUM_MARKET_REGIME Detect(const int shift,
                              double &atr_value,
                              double &atr_percentile,
                              double &adx_value);

   bool              IsReady(const int shift) const;
  };

//+------------------------------------------------------------------+
CMarketRegime::CMarketRegime(void)
  {
   m_symbol              = "";
   m_timeframe           = PERIOD_CURRENT;
   m_atr_handle          = INVALID_HANDLE;
   m_adx_handle          = INVALID_HANDLE;
   m_atr_period          = 14;
   m_adx_period          = 14;
   m_percentile_lookback = 100;
   m_high_vol_percentile = 90.0;
   m_low_vol_percentile  = 10.0;
   m_adx_trend_threshold = 22.0;
   m_initialized         = false;
  }

//+------------------------------------------------------------------+
CMarketRegime::~CMarketRegime(void)
  {
   Deinit();
  }

//+------------------------------------------------------------------+
bool CMarketRegime::Init(const string symbol,
                          const ENUM_TIMEFRAMES timeframe,
                          const int atr_period,
                          const int adx_period,
                          const int percentile_lookback,
                          const double high_vol_percentile,
                          const double low_vol_percentile,
                          const double adx_trend_threshold)
  {
   m_symbol              = symbol;
   m_timeframe           = timeframe;
   m_atr_period          = MathMax(2, atr_period);
   m_adx_period          = MathMax(2, adx_period);
   m_percentile_lookback = MathMax(20, percentile_lookback);
   m_high_vol_percentile = high_vol_percentile;
   m_low_vol_percentile  = low_vol_percentile;
   m_adx_trend_threshold = adx_trend_threshold;

   m_atr_handle = iATR(m_symbol, m_timeframe, m_atr_period);
   m_adx_handle = iADX(m_symbol, m_timeframe, m_adx_period);

   if(m_atr_handle == INVALID_HANDLE || m_adx_handle == INVALID_HANDLE)
     {
      PrintFormat("CMarketRegime::Init failed to create handles for %s %s (err=%d)",
                  m_symbol, EnumToString(m_timeframe), GetLastError());
      m_initialized = false;
      return(false);
     }

   m_initialized = true;
   return(true);
  }

//+------------------------------------------------------------------+
void CMarketRegime::Deinit(void)
  {
   if(m_atr_handle != INVALID_HANDLE)
     {
      IndicatorRelease(m_atr_handle);
      m_atr_handle = INVALID_HANDLE;
     }
   if(m_adx_handle != INVALID_HANDLE)
     {
      IndicatorRelease(m_adx_handle);
      m_adx_handle = INVALID_HANDLE;
     }
   m_initialized = false;
  }

//+------------------------------------------------------------------+
bool CMarketRegime::IsReady(const int shift) const
  {
   if(!m_initialized)
      return(false);
   int bars = Bars(m_symbol, m_timeframe);
   if(bars < shift + m_percentile_lookback + m_atr_period + 2)
      return(false);
   return(true);
  }

//+------------------------------------------------------------------+
//| Detect current regime using only bars at/after "shift" (closed)  |
//+------------------------------------------------------------------+
ENUM_MARKET_REGIME CMarketRegime::Detect(const int shift,
                                          double &atr_value,
                                          double &atr_percentile,
                                          double &adx_value)
  {
   atr_value      = 0.0;
   atr_percentile = 50.0;
   adx_value      = 0.0;

   if(!IsReady(shift))
      return(REGIME_UNSTABLE);

   double atr_buf[];
   ArraySetAsSeries(atr_buf, true);
   int need = m_percentile_lookback + shift + 1;
   if(CopyBuffer(m_atr_handle, 0, 0, need, atr_buf) < need)
      return(REGIME_UNSTABLE);

   double adx_buf[];
   ArraySetAsSeries(adx_buf, true);
   if(CopyBuffer(m_adx_handle, 0, 0, shift + 2, adx_buf) < shift + 2)
      return(REGIME_UNSTABLE);

   atr_value = atr_buf[shift];
   adx_value = adx_buf[shift];

   if(atr_value <= 0.0)
      return(REGIME_UNSTABLE);

   //--- Percentile rank of current ATR within the lookback window (bars strictly after "shift")
   int count_below = 0;
   int total       = 0;
   for(int i = shift; i < shift + m_percentile_lookback; i++)
     {
      if(i >= ArraySize(atr_buf))
         break;
      total++;
      if(atr_buf[i] <= atr_value)
         count_below++;
     }
   if(total <= 0)
      return(REGIME_UNSTABLE);

   atr_percentile = (double)count_below / (double)total * 100.0;

   if(atr_percentile >= m_high_vol_percentile)
      return(REGIME_HIGH_VOLATILITY);

   if(atr_percentile <= m_low_vol_percentile)
      return(REGIME_LOW_VOLATILITY);

   if(adx_value >= m_adx_trend_threshold)
      return(REGIME_TRENDING);

   return(REGIME_RANGING);
  }
//+------------------------------------------------------------------+
