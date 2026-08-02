//+------------------------------------------------------------------+
//|                                                RiskManager.mqh   |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Conservative risk-control module for OTCTradeEA.mq5. Enforces    |
//| fixed-lot / percentage risk sizing, daily loss limits, maximum   |
//| consecutive losses, spread and trading-hour filters, an          |
//| emergency equity stop, and a strict one-trade-per-symbol rule.   |
//| Contains NO martingale, grid, or recovery-multiplier logic.      |
//+------------------------------------------------------------------+
#property strict

enum ENUM_LOT_MODE
  {
   LOT_MODE_FIXED = 0,       // Fixed lot size
   LOT_MODE_PERCENT_RISK      // Percentage of equity risk per trade
  };

//+------------------------------------------------------------------+
//| CRiskManager                                                     |
//+------------------------------------------------------------------+
class CRiskManager
  {
private:
   ENUM_LOT_MODE     m_lot_mode;
   double            m_fixed_lot;
   double            m_risk_percent;         // e.g. 0.25 = 0.25% of equity
   double            m_min_reward_risk;      // minimum reward:risk ratio
   double            m_max_spread_points;
   int               m_max_trades_per_day;
   double            m_max_daily_loss_percent;
   int               m_max_consecutive_losses;
   double            m_emergency_equity_stop_percent; // % drawdown from start-of-day equity
   int               m_trading_hour_start;
   int               m_trading_hour_end;
   bool              m_use_trading_hours;

   //--- running state
   double            m_day_start_equity;
   datetime          m_current_day;
   int               m_trades_today;
   double            m_daily_realized_loss;
   int               m_consecutive_losses;
   bool              m_halted_for_day;
   bool              m_halted_permanently;

public:
                     CRiskManager(void);

   void              Configure(const ENUM_LOT_MODE lot_mode,
                                const double fixed_lot,
                                const double risk_percent,
                                const double min_reward_risk,
                                const double max_spread_points,
                                const int max_trades_per_day,
                                const double max_daily_loss_percent,
                                const int max_consecutive_losses,
                                const double emergency_equity_stop_percent,
                                const bool use_trading_hours,
                                const int trading_hour_start,
                                const int trading_hour_end);

   void              OnTick(void);   // call once per tick to roll daily counters / check equity stop
   bool              CanOpenNewTrade(const string symbol, string &block_reason);
   double            CalculateLotSize(const string symbol, const double sl_points) const;
   bool              CheckRewardRisk(const double reward_points, const double risk_points) const;
   bool              CheckSpread(const string symbol) const;
   bool              CheckTradingHours(void) const;
   bool              CheckOnePositionPerSymbol(const string symbol) const;

   void              RegisterTradeOpened(void);
   void              RegisterTradeClosed(const double profit);

   bool              IsHalted(void) const { return(m_halted_for_day || m_halted_permanently); }
   int               ConsecutiveLosses(void) const { return(m_consecutive_losses); }
   int               TradesToday(void) const { return(m_trades_today); }
  };

//+------------------------------------------------------------------+
CRiskManager::CRiskManager(void)
  {
   m_lot_mode                      = LOT_MODE_PERCENT_RISK;
   m_fixed_lot                     = 0.01;
   m_risk_percent                  = 0.25;
   m_min_reward_risk               = 1.2;
   m_max_spread_points             = 30;
   m_max_trades_per_day            = 10;
   m_max_daily_loss_percent        = 3.0;
   m_max_consecutive_losses        = 4;
   m_emergency_equity_stop_percent = 10.0;
   m_trading_hour_start            = 0;
   m_trading_hour_end              = 23;
   m_use_trading_hours             = false;

   m_day_start_equity   = 0.0;
   m_current_day        = 0;
   m_trades_today       = 0;
   m_daily_realized_loss= 0.0;
   m_consecutive_losses = 0;
   m_halted_for_day     = false;
   m_halted_permanently = false;
  }

//+------------------------------------------------------------------+
void CRiskManager::Configure(const ENUM_LOT_MODE lot_mode,
                              const double fixed_lot,
                              const double risk_percent,
                              const double min_reward_risk,
                              const double max_spread_points,
                              const int max_trades_per_day,
                              const double max_daily_loss_percent,
                              const int max_consecutive_losses,
                              const double emergency_equity_stop_percent,
                              const bool use_trading_hours,
                              const int trading_hour_start,
                              const int trading_hour_end)
  {
   m_lot_mode                      = lot_mode;
   m_fixed_lot                     = fixed_lot;
   m_risk_percent                  = risk_percent;
   m_min_reward_risk               = min_reward_risk;
   m_max_spread_points             = max_spread_points;
   m_max_trades_per_day            = max_trades_per_day;
   m_max_daily_loss_percent        = max_daily_loss_percent;
   m_max_consecutive_losses        = max_consecutive_losses;
   m_emergency_equity_stop_percent = emergency_equity_stop_percent;
   m_use_trading_hours             = use_trading_hours;
   m_trading_hour_start            = trading_hour_start;
   m_trading_hour_end              = trading_hour_end;

   m_day_start_equity = AccountInfoDouble(ACCOUNT_EQUITY);
   m_current_day       = 0;
  }

//+------------------------------------------------------------------+
//| Roll daily counters and check the emergency equity stop          |
//+------------------------------------------------------------------+
void CRiskManager::OnTick(void)
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   datetime today_start = StringToTime(StringFormat("%04d.%02d.%02d 00:00:00", dt.year, dt.mon, dt.day));

   if(today_start != m_current_day)
     {
      m_current_day         = today_start;
      m_trades_today         = 0;
      m_daily_realized_loss  = 0.0;
      m_halted_for_day       = false;
      m_day_start_equity     = AccountInfoDouble(ACCOUNT_EQUITY);
     }

   //--- Emergency equity stop, permanent halt until manual restart
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double reference = MathMax(balance, 1.0);
   double drawdown_percent = (reference - equity) / reference * 100.0;
   if(drawdown_percent >= m_emergency_equity_stop_percent)
     {
      if(!m_halted_permanently)
         PrintFormat("RiskManager: EMERGENCY EQUITY STOP triggered. Drawdown=%.2f%% >= limit %.2f%%",
                     drawdown_percent, m_emergency_equity_stop_percent);
      m_halted_permanently = true;
     }

   //--- Daily loss halt
   if(m_day_start_equity > 0.0)
     {
      double day_loss_percent = (m_day_start_equity - equity) / m_day_start_equity * 100.0;
      if(day_loss_percent >= m_max_daily_loss_percent)
         m_halted_for_day = true;
     }
  }

//+------------------------------------------------------------------+
bool CRiskManager::CheckOnePositionPerSymbol(const string symbol) const
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(PositionGetString(POSITION_SYMBOL) == symbol)
         return(false);
     }
   return(true);
  }

//+------------------------------------------------------------------+
bool CRiskManager::CheckSpread(const string symbol) const
  {
   double spread_points = (double)SymbolInfoInteger(symbol, SYMBOL_SPREAD);
   return(spread_points <= m_max_spread_points);
  }

//+------------------------------------------------------------------+
bool CRiskManager::CheckTradingHours(void) const
  {
   if(!m_use_trading_hours)
      return(true);
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(m_trading_hour_start <= m_trading_hour_end)
      return(dt.hour >= m_trading_hour_start && dt.hour <= m_trading_hour_end);
   //--- wraps midnight
   return(dt.hour >= m_trading_hour_start || dt.hour <= m_trading_hour_end);
  }

//+------------------------------------------------------------------+
bool CRiskManager::CheckRewardRisk(const double reward_points, const double risk_points) const
  {
   if(risk_points <= 0.0)
      return(false);
   return((reward_points / risk_points) >= m_min_reward_risk);
  }

//+------------------------------------------------------------------+
bool CRiskManager::CanOpenNewTrade(const string symbol, string &block_reason)
  {
   block_reason = "";

   if(m_halted_permanently)
     {
      block_reason = "Emergency equity stop active";
      return(false);
     }
   if(m_halted_for_day)
     {
      block_reason = "Max daily loss reached";
      return(false);
     }
   if(m_trades_today >= m_max_trades_per_day)
     {
      block_reason = "Max trades per day reached";
      return(false);
     }
   if(m_consecutive_losses >= m_max_consecutive_losses)
     {
      block_reason = "Max consecutive losses reached";
      return(false);
     }
   if(!CheckSpread(symbol))
     {
      block_reason = "Spread too wide";
      return(false);
     }
   if(!CheckTradingHours())
     {
      block_reason = "Outside trading hours";
      return(false);
     }
   if(!CheckOnePositionPerSymbol(symbol))
     {
      block_reason = "Position already open for symbol";
      return(false);
     }
   return(true);
  }

//+------------------------------------------------------------------+
//| Lot size calculation. No martingale / recovery multiplier is     |
//| ever applied - sizing depends only on configured risk % and the  |
//| stop-loss distance of the current, independent trade.            |
//+------------------------------------------------------------------+
double CRiskManager::CalculateLotSize(const string symbol, const double sl_points) const
  {
   double min_lot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double max_lot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lot_step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   double lots = m_fixed_lot;

   if(m_lot_mode == LOT_MODE_PERCENT_RISK)
     {
      double tick_value = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
      double tick_size  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
      double point      = SymbolInfoDouble(symbol, SYMBOL_POINT);

      if(sl_points <= 0.0 || tick_value <= 0.0 || tick_size <= 0.0 || point <= 0.0)
        {
         lots = min_lot;
        }
      else
        {
         double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
         double risk_amount = equity * (m_risk_percent / 100.0);
         double value_per_point = (tick_value / tick_size) * point;
         double loss_per_lot = sl_points * value_per_point;
         if(loss_per_lot <= 0.0)
            lots = min_lot;
         else
            lots = risk_amount / loss_per_lot;
        }
     }

   if(lot_step > 0.0)
      lots = MathFloor(lots / lot_step) * lot_step;

   lots = MathMax(min_lot, MathMin(max_lot, lots));
   return(NormalizeDouble(lots, 2));
  }

//+------------------------------------------------------------------+
void CRiskManager::RegisterTradeOpened(void)
  {
   m_trades_today++;
  }

//+------------------------------------------------------------------+
//| Register the realized result of a closed trade. This only        |
//| tracks statistics for filtering; it never scales future size.    |
//+------------------------------------------------------------------+
void CRiskManager::RegisterTradeClosed(const double profit)
  {
   if(profit < 0.0)
     {
      m_consecutive_losses++;
      m_daily_realized_loss += MathAbs(profit);
     }
   else if(profit > 0.0)
     {
      m_consecutive_losses = 0;
     }
  }
//+------------------------------------------------------------------+
