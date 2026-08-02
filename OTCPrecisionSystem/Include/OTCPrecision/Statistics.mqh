//+------------------------------------------------------------------+
//|                                                Statistics.mqh    |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Tracks the ACTUAL measured outcome of every settled signal.      |
//| No statistic in this module is ever hardcoded, fabricated, or    |
//| adjusted for display purposes. All win rates are derived purely  |
//| from CALL/PUT signals that have been settled against real,       |
//| already-closed price data. Aggregates are maintained             |
//| incrementally (O(1) per settled signal) to avoid recalculating   |
//| the full history on every tick.                                  |
//+------------------------------------------------------------------+
#property strict

#include <OTCPrecision/MarketRegime.mqh>

#define OTC_MIN_SAMPLE_DEFAULT 200

//--- Result classification of a settled signal
enum ENUM_SIGNAL_RESULT
  {
   SIGNAL_RESULT_LOSS = -1,
   SIGNAL_RESULT_DRAW =  0,
   SIGNAL_RESULT_WIN  =  1
  };

//--- A single settled (fully evaluated) signal record
struct SSignalRecord
  {
   datetime            signal_time;
   datetime            expiry_time;
   string              symbol;
   ENUM_TIMEFRAMES     timeframe;
   int                 direction;         // 1 = CALL, -1 = PUT
   double              entry_price;
   double              exit_price;
   int                 result;            // ENUM_SIGNAL_RESULT
   int                 expiry_seconds;
   ENUM_MARKET_REGIME  regime;
   double              confidence;
   int                 modules_agreeing;
  };

//--- Generic named bucket used for symbol / timeframe / expiry breakdowns
struct SBucketStat
  {
   string            key;
   int               total;
   int               wins;
   int               losses;
   int               draws;
  };

//+------------------------------------------------------------------+
//| CSignalStatistics                                                 |
//+------------------------------------------------------------------+
class CSignalStatistics
  {
private:
   int               m_min_sample_size;
   double            m_default_payout_percent;

   //--- overall
   int               m_total;
   int               m_wins;
   int               m_losses;
   int               m_draws;

   //--- direction split
   int               m_call_total, m_call_wins, m_call_losses, m_call_draws;
   int               m_put_total,  m_put_wins,  m_put_losses,  m_put_draws;

   //--- regime buckets (indexed by ENUM_MARKET_REGIME, 5 members)
   int               m_regime_total[5];
   int               m_regime_wins[5];
   int               m_regime_losses[5];
   int               m_regime_draws[5];

   //--- hour-of-day buckets (0-23, server time)
   int               m_hour_total[24];
   int               m_hour_wins[24];
   int               m_hour_losses[24];
   int               m_hour_draws[24];

   //--- dynamic breakdown buckets
   SBucketStat       m_symbol_buckets[];
   SBucketStat       m_timeframe_buckets[];
   SBucketStat       m_expiry_buckets[];
   SBucketStat       m_daily_buckets[];

   //--- consecutive streak tracking
   int               m_cur_consec_wins;
   int               m_cur_consec_losses;
   int               m_max_consec_wins;
   int               m_max_consec_losses;

   //--- compact result series retained for on-demand simulation (payout can vary)
   int               m_result_series[];     // ENUM_SIGNAL_RESULT values, chronological

   //--- "today" cache
   datetime          m_today_date;
   int               m_today_total;
   int               m_today_wins;
   int               m_today_losses;
   int               m_today_draws;

   int               FindOrAddBucket(SBucketStat &arr[], const string key);
   void              UpdateBucket(SBucketStat &arr[], const string key, const int result);
   double            BucketWinRate(SBucketStat &arr[], const string key) const;

public:
                     CSignalStatistics(void);

   void              Init(const int min_sample_size, const double default_payout_percent);
   void              Reset(void);

   void              AddSettledSignal(const SSignalRecord &rec);

   //--- headline
   int               TotalSignals(void)  const { return(m_total); }
   int               Wins(void)          const { return(m_wins); }
   int               Losses(void)        const { return(m_losses); }
   int               Draws(void)         const { return(m_draws); }

   bool              HasSufficientSample(void) const { return(m_total >= m_min_sample_size); }
   string            WinRateDisplayText(void) const;

   double            WinRateExcludingDraws(void) const;
   double            WinRateIncludingDrawsAsNonWins(void) const;

   double            CallWinRate(void) const;
   double            PutWinRate(void) const;

   double            WinRateBySymbol(const string symbol);
   double            WinRateByTimeframe(const ENUM_TIMEFRAMES tf);
   double            WinRateByExpiry(const int expiry_seconds);
   double            WinRateByRegime(const ENUM_MARKET_REGIME regime) const;
   double            WinRateByHour(const int hour) const;

   int               MaxConsecutiveWins(void)    const { return(m_max_consec_wins); }
   int               MaxConsecutiveLosses(void)  const { return(m_max_consec_losses); }
   int               CurrentConsecutiveWins(void)   const { return(m_cur_consec_wins); }
   int               CurrentConsecutiveLosses(void) const { return(m_cur_consec_losses); }

   int               SignalsToday(void) const { return(m_today_total); }
   double            SessionWinRate(void) const;
   double            AverageSignalsPerDay(void) const;

   //--- on-demand simulation (not incremental - only recomputed when explicitly requested)
   double            ProfitFactorSimulation(const double payout_percent) const;
   double            ExpectedValuePerSignal(const double payout_percent) const;
   double            MaxSimulatedDrawdown(const double payout_percent, const double stake) const;

   //--- CSV / report helpers
   static void       WriteCSVHeader(const int file_handle);
   static void       WriteCSVRow(const int file_handle, const SSignalRecord &rec);
   bool              ExportSummaryReport(const string filename) const;
  };

//+------------------------------------------------------------------+
CSignalStatistics::CSignalStatistics(void)
  {
   m_min_sample_size        = OTC_MIN_SAMPLE_DEFAULT;
   m_default_payout_percent = 85.0;
   Reset();
  }

//+------------------------------------------------------------------+
void CSignalStatistics::Init(const int min_sample_size, const double default_payout_percent)
  {
   m_min_sample_size        = (min_sample_size > 0) ? min_sample_size : OTC_MIN_SAMPLE_DEFAULT;
   m_default_payout_percent = default_payout_percent;
  }

//+------------------------------------------------------------------+
void CSignalStatistics::Reset(void)
  {
   m_total = 0; m_wins = 0; m_losses = 0; m_draws = 0;
   m_call_total = 0; m_call_wins = 0; m_call_losses = 0; m_call_draws = 0;
   m_put_total  = 0; m_put_wins  = 0; m_put_losses  = 0; m_put_draws  = 0;

   ArrayInitialize(m_regime_total, 0);
   ArrayInitialize(m_regime_wins, 0);
   ArrayInitialize(m_regime_losses, 0);
   ArrayInitialize(m_regime_draws, 0);

   ArrayInitialize(m_hour_total, 0);
   ArrayInitialize(m_hour_wins, 0);
   ArrayInitialize(m_hour_losses, 0);
   ArrayInitialize(m_hour_draws, 0);

   ArrayResize(m_symbol_buckets, 0);
   ArrayResize(m_timeframe_buckets, 0);
   ArrayResize(m_expiry_buckets, 0);
   ArrayResize(m_daily_buckets, 0);
   ArrayResize(m_result_series, 0);

   m_cur_consec_wins   = 0;
   m_cur_consec_losses = 0;
   m_max_consec_wins   = 0;
   m_max_consec_losses = 0;

   m_today_date  = 0;
   m_today_total = 0;
   m_today_wins  = 0;
   m_today_losses= 0;
   m_today_draws = 0;
  }

//+------------------------------------------------------------------+
int CSignalStatistics::FindOrAddBucket(SBucketStat &arr[], const string key)
  {
   int n = ArraySize(arr);
   for(int i = 0; i < n; i++)
      if(arr[i].key == key)
         return(i);

   ArrayResize(arr, n + 1);
   arr[n].key    = key;
   arr[n].total  = 0;
   arr[n].wins   = 0;
   arr[n].losses = 0;
   arr[n].draws  = 0;
   return(n);
  }

//+------------------------------------------------------------------+
void CSignalStatistics::UpdateBucket(SBucketStat &arr[], const string key, const int result)
  {
   int idx = FindOrAddBucket(arr, key);
   arr[idx].total++;
   if(result == SIGNAL_RESULT_WIN)
      arr[idx].wins++;
   else if(result == SIGNAL_RESULT_LOSS)
      arr[idx].losses++;
   else
      arr[idx].draws++;
  }

//+------------------------------------------------------------------+
double CSignalStatistics::BucketWinRate(SBucketStat &arr[], const string key) const
  {
   int n = ArraySize(arr);
   for(int i = 0; i < n; i++)
     {
      if(arr[i].key == key)
        {
         int decided = arr[i].wins + arr[i].losses;
         if(decided <= 0)
            return(0.0);
         return((double)arr[i].wins / (double)decided * 100.0);
        }
     }
   return(0.0);
  }

//+------------------------------------------------------------------+
//| Register a fully settled signal. Called exactly once per signal  |
//| after its expiry has been reached using real closed-bar prices.  |
//+------------------------------------------------------------------+
void CSignalStatistics::AddSettledSignal(const SSignalRecord &rec)
  {
   m_total++;
   if(rec.result == SIGNAL_RESULT_WIN)
      m_wins++;
   else if(rec.result == SIGNAL_RESULT_LOSS)
      m_losses++;
   else
      m_draws++;

   if(rec.direction > 0)
     {
      m_call_total++;
      if(rec.result == SIGNAL_RESULT_WIN) m_call_wins++;
      else if(rec.result == SIGNAL_RESULT_LOSS) m_call_losses++;
      else m_call_draws++;
     }
   else
     {
      m_put_total++;
      if(rec.result == SIGNAL_RESULT_WIN) m_put_wins++;
      else if(rec.result == SIGNAL_RESULT_LOSS) m_put_losses++;
      else m_put_draws++;
     }

   int ridx = (int)rec.regime;
   if(ridx >= 0 && ridx < 5)
     {
      m_regime_total[ridx]++;
      if(rec.result == SIGNAL_RESULT_WIN) m_regime_wins[ridx]++;
      else if(rec.result == SIGNAL_RESULT_LOSS) m_regime_losses[ridx]++;
      else m_regime_draws[ridx]++;
     }

   MqlDateTime dt;
   TimeToStruct(rec.signal_time, dt);
   int hour = dt.hour;
   if(hour >= 0 && hour < 24)
     {
      m_hour_total[hour]++;
      if(rec.result == SIGNAL_RESULT_WIN) m_hour_wins[hour]++;
      else if(rec.result == SIGNAL_RESULT_LOSS) m_hour_losses[hour]++;
      else m_hour_draws[hour]++;
     }

   UpdateBucket(m_symbol_buckets, rec.symbol, rec.result);
   UpdateBucket(m_timeframe_buckets, EnumToString(rec.timeframe), rec.result);
   UpdateBucket(m_expiry_buckets, IntegerToString(rec.expiry_seconds), rec.result);

   string day_key = StringFormat("%04d.%02d.%02d", dt.year, dt.mon, dt.day);
   UpdateBucket(m_daily_buckets, day_key, rec.result);

   //--- consecutive streaks (draws neither extend nor reset either streak)
   if(rec.result == SIGNAL_RESULT_WIN)
     {
      m_cur_consec_wins++;
      m_cur_consec_losses = 0;
      if(m_cur_consec_wins > m_max_consec_wins)
         m_max_consec_wins = m_cur_consec_wins;
     }
   else if(rec.result == SIGNAL_RESULT_LOSS)
     {
      m_cur_consec_losses++;
      m_cur_consec_wins = 0;
      if(m_cur_consec_losses > m_max_consec_losses)
         m_max_consec_losses = m_cur_consec_losses;
     }

   //--- "today" cache (server time "today" at the moment of settlement)
   datetime today_start = StringToTime(StringFormat("%04d.%02d.%02d 00:00:00", dt.year, dt.mon, dt.day));
   if(today_start != m_today_date)
     {
      m_today_date  = today_start;
      m_today_total = 0;
      m_today_wins  = 0;
      m_today_losses= 0;
      m_today_draws = 0;
     }
   m_today_total++;
   if(rec.result == SIGNAL_RESULT_WIN) m_today_wins++;
   else if(rec.result == SIGNAL_RESULT_LOSS) m_today_losses++;
   else m_today_draws++;

   int n = ArraySize(m_result_series);
   ArrayResize(m_result_series, n + 1);
   m_result_series[n] = rec.result;
  }

//+------------------------------------------------------------------+
string CSignalStatistics::WinRateDisplayText(void) const
  {
   if(!HasSufficientSample())
      return(StringFormat("INSUFFICIENT SAMPLE (%d/%d)", m_total, m_min_sample_size));
   return(StringFormat("%.2f%%", WinRateExcludingDraws()));
  }

//+------------------------------------------------------------------+
double CSignalStatistics::WinRateExcludingDraws(void) const
  {
   int decided = m_wins + m_losses;
   if(decided <= 0)
      return(0.0);
   return((double)m_wins / (double)decided * 100.0);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::WinRateIncludingDrawsAsNonWins(void) const
  {
   if(m_total <= 0)
      return(0.0);
   return((double)m_wins / (double)m_total * 100.0);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::CallWinRate(void) const
  {
   int decided = m_call_wins + m_call_losses;
   if(decided <= 0)
      return(0.0);
   return((double)m_call_wins / (double)decided * 100.0);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::PutWinRate(void) const
  {
   int decided = m_put_wins + m_put_losses;
   if(decided <= 0)
      return(0.0);
   return((double)m_put_wins / (double)decided * 100.0);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::WinRateBySymbol(const string symbol)
  {
   return(BucketWinRate(m_symbol_buckets, symbol));
  }

//+------------------------------------------------------------------+
double CSignalStatistics::WinRateByTimeframe(const ENUM_TIMEFRAMES tf)
  {
   return(BucketWinRate(m_timeframe_buckets, EnumToString(tf)));
  }

//+------------------------------------------------------------------+
double CSignalStatistics::WinRateByExpiry(const int expiry_seconds)
  {
   return(BucketWinRate(m_expiry_buckets, IntegerToString(expiry_seconds)));
  }

//+------------------------------------------------------------------+
double CSignalStatistics::WinRateByRegime(const ENUM_MARKET_REGIME regime) const
  {
   int idx = (int)regime;
   if(idx < 0 || idx >= 5)
      return(0.0);
   int decided = m_regime_wins[idx] + m_regime_losses[idx];
   if(decided <= 0)
      return(0.0);
   return((double)m_regime_wins[idx] / (double)decided * 100.0);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::WinRateByHour(const int hour) const
  {
   if(hour < 0 || hour >= 24)
      return(0.0);
   int decided = m_hour_wins[hour] + m_hour_losses[hour];
   if(decided <= 0)
      return(0.0);
   return((double)m_hour_wins[hour] / (double)decided * 100.0);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::SessionWinRate(void) const
  {
   int decided = m_today_wins + m_today_losses;
   if(decided <= 0)
      return(0.0);
   return((double)m_today_wins / (double)decided * 100.0);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::AverageSignalsPerDay(void) const
  {
   int days = ArraySize(m_daily_buckets);
   if(days <= 0)
      return(0.0);
   return((double)m_total / (double)days);
  }

//+------------------------------------------------------------------+
//| Simulated profit factor assuming a fixed percentage payout on    |
//| wins, full stake lost on losses, and stake returned on draws.    |
//| This is a simulation only - no real funds or trades involved.    |
//+------------------------------------------------------------------+
double CSignalStatistics::ProfitFactorSimulation(const double payout_percent) const
  {
   double gross_profit = 0.0;
   double gross_loss   = 0.0;
   int n = ArraySize(m_result_series);
   for(int i = 0; i < n; i++)
     {
      if(m_result_series[i] == SIGNAL_RESULT_WIN)
         gross_profit += (payout_percent / 100.0);
      else if(m_result_series[i] == SIGNAL_RESULT_LOSS)
         gross_loss += 1.0;
     }
   if(gross_loss <= 0.0)
      return(gross_profit > 0.0 ? gross_profit : 0.0);
   return(gross_profit / gross_loss);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::ExpectedValuePerSignal(const double payout_percent) const
  {
   int n = ArraySize(m_result_series);
   if(n <= 0)
      return(0.0);
   double total_pl = 0.0;
   for(int i = 0; i < n; i++)
     {
      if(m_result_series[i] == SIGNAL_RESULT_WIN)
         total_pl += (payout_percent / 100.0);
      else if(m_result_series[i] == SIGNAL_RESULT_LOSS)
         total_pl -= 1.0;
      //--- draws: stake returned, zero net effect
     }
   return(total_pl / (double)n);
  }

//+------------------------------------------------------------------+
double CSignalStatistics::MaxSimulatedDrawdown(const double payout_percent, const double stake) const
  {
   int n = ArraySize(m_result_series);
   if(n <= 0)
      return(0.0);

   double balance   = 0.0;
   double peak      = 0.0;
   double max_dd    = 0.0;

   for(int i = 0; i < n; i++)
     {
      if(m_result_series[i] == SIGNAL_RESULT_WIN)
         balance += stake * (payout_percent / 100.0);
      else if(m_result_series[i] == SIGNAL_RESULT_LOSS)
         balance -= stake;

      if(balance > peak)
         peak = balance;

      double dd = peak - balance;
      if(dd > max_dd)
         max_dd = dd;
     }
   return(max_dd);
  }

//+------------------------------------------------------------------+
void CSignalStatistics::WriteCSVHeader(const int file_handle)
  {
   if(file_handle == INVALID_HANDLE)
      return;
   FileWrite(file_handle, "SignalTime", "ExpiryTime", "Symbol", "Timeframe", "Direction",
             "EntryPrice", "ExitPrice", "Result", "ExpirySeconds", "Regime", "Confidence",
             "ModulesAgreeing");
  }

//+------------------------------------------------------------------+
void CSignalStatistics::WriteCSVRow(const int file_handle, const SSignalRecord &rec)
  {
   if(file_handle == INVALID_HANDLE)
      return;
   string direction_text = (rec.direction > 0) ? "CALL" : "PUT";
   string result_text = "DRAW";
   if(rec.result == SIGNAL_RESULT_WIN)  result_text = "WIN";
   if(rec.result == SIGNAL_RESULT_LOSS) result_text = "LOSS";

   FileWrite(file_handle,
             TimeToString(rec.signal_time, TIME_DATE | TIME_SECONDS),
             TimeToString(rec.expiry_time, TIME_DATE | TIME_SECONDS),
             rec.symbol,
             EnumToString(rec.timeframe),
             direction_text,
             DoubleToString(rec.entry_price, 8),
             DoubleToString(rec.exit_price, 8),
             result_text,
             rec.expiry_seconds,
             RegimeToString(rec.regime),
             DoubleToString(rec.confidence, 2),
             rec.modules_agreeing);
  }

//+------------------------------------------------------------------+
//| Write a full breakdown summary report. Every losing symbol,      |
//| timeframe and expiry bucket is included - nothing is hidden.     |
//+------------------------------------------------------------------+
bool CSignalStatistics::ExportSummaryReport(const string filename) const
  {
   int handle = FileOpen(filename, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(handle == INVALID_HANDLE)
     {
      PrintFormat("CSignalStatistics::ExportSummaryReport failed to open %s (err=%d)", filename, GetLastError());
      return(false);
     }

   FileWrite(handle, "OTC Precision Signal System - Statistics Summary Report");
   FileWrite(handle, "Generated: " + TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS));
   FileWrite(handle, "");
   FileWrite(handle, "Total settled signals: " + IntegerToString(m_total));
   FileWrite(handle, "Minimum sample requirement: " + IntegerToString(m_min_sample_size));
   FileWrite(handle, "Sample sufficient: " + (HasSufficientSample() ? "YES" : "NO"));
   FileWrite(handle, "Wins: " + IntegerToString(m_wins));
   FileWrite(handle, "Losses: " + IntegerToString(m_losses));
   FileWrite(handle, "Draws: " + IntegerToString(m_draws));
   FileWrite(handle, "Win rate (excluding draws): " + DoubleToString(WinRateExcludingDraws(), 2) + "%");
   FileWrite(handle, "Win rate (draws counted as non-wins): " + DoubleToString(WinRateIncludingDrawsAsNonWins(), 2) + "%");
   FileWrite(handle, "CALL win rate: " + DoubleToString(CallWinRate(), 2) + "%  (" + IntegerToString(m_call_total) + " signals)");
   FileWrite(handle, "PUT win rate: " + DoubleToString(PutWinRate(), 2) + "%  (" + IntegerToString(m_put_total) + " signals)");
   FileWrite(handle, "Max consecutive wins: " + IntegerToString(m_max_consec_wins));
   FileWrite(handle, "Max consecutive losses: " + IntegerToString(m_max_consec_losses));
   FileWrite(handle, "Average signals per day: " + DoubleToString(AverageSignalsPerDay(), 2));
   FileWrite(handle, "");

   FileWrite(handle, "--- Win rate by symbol ---");
   for(int i = 0; i < ArraySize(m_symbol_buckets); i++)
     {
      int decided = m_symbol_buckets[i].wins + m_symbol_buckets[i].losses;
      double wr = (decided > 0) ? (double)m_symbol_buckets[i].wins / decided * 100.0 : 0.0;
      FileWrite(handle, m_symbol_buckets[i].key + ": " + DoubleToString(wr, 2) + "% (" +
                IntegerToString(m_symbol_buckets[i].total) + " signals)");
     }

   FileWrite(handle, "");
   FileWrite(handle, "--- Win rate by timeframe ---");
   for(int i = 0; i < ArraySize(m_timeframe_buckets); i++)
     {
      int decided = m_timeframe_buckets[i].wins + m_timeframe_buckets[i].losses;
      double wr = (decided > 0) ? (double)m_timeframe_buckets[i].wins / decided * 100.0 : 0.0;
      FileWrite(handle, m_timeframe_buckets[i].key + ": " + DoubleToString(wr, 2) + "% (" +
                IntegerToString(m_timeframe_buckets[i].total) + " signals)");
     }

   FileWrite(handle, "");
   FileWrite(handle, "--- Win rate by expiry (seconds) ---");
   for(int i = 0; i < ArraySize(m_expiry_buckets); i++)
     {
      int decided = m_expiry_buckets[i].wins + m_expiry_buckets[i].losses;
      double wr = (decided > 0) ? (double)m_expiry_buckets[i].wins / decided * 100.0 : 0.0;
      FileWrite(handle, m_expiry_buckets[i].key + ": " + DoubleToString(wr, 2) + "% (" +
                IntegerToString(m_expiry_buckets[i].total) + " signals)");
     }

   FileWrite(handle, "");
   FileWrite(handle, "--- Win rate by regime ---");
   for(int r = 0; r < 5; r++)
     {
      int decided = m_regime_wins[r] + m_regime_losses[r];
      double wr = (decided > 0) ? (double)m_regime_wins[r] / decided * 100.0 : 0.0;
      FileWrite(handle, RegimeToString((ENUM_MARKET_REGIME)r) + ": " + DoubleToString(wr, 2) + "% (" +
                IntegerToString(m_regime_total[r]) + " signals)");
     }

   FileWrite(handle, "");
   FileWrite(handle, "--- Win rate by hour (server time) ---");
   for(int h = 0; h < 24; h++)
     {
      int decided = m_hour_wins[h] + m_hour_losses[h];
      double wr = (decided > 0) ? (double)m_hour_wins[h] / decided * 100.0 : 0.0;
      FileWrite(handle, IntegerToString(h) + ":00 -> " + DoubleToString(wr, 2) + "% (" +
                IntegerToString(m_hour_total[h]) + " signals)");
     }

   FileWrite(handle, "");
   FileWrite(handle, "--- Simulation (payout=" + DoubleToString(m_default_payout_percent, 1) + "%) ---");
   FileWrite(handle, "Profit factor: " + DoubleToString(ProfitFactorSimulation(m_default_payout_percent), 3));
   FileWrite(handle, "Expected value per signal (stake units): " + DoubleToString(ExpectedValuePerSignal(m_default_payout_percent), 4));
   FileWrite(handle, "Max simulated drawdown (stake=1): " + DoubleToString(MaxSimulatedDrawdown(m_default_payout_percent, 1.0), 2));

   FileClose(handle);
   return(true);
  }
//+------------------------------------------------------------------+
