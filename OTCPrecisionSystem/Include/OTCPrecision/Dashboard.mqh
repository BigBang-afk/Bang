//+------------------------------------------------------------------+
//|                                                  Dashboard.mqh   |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Lightweight on-chart dashboard rendered with native chart         |
//| objects in the upper-right corner. Objects are created once and  |
//| only their text/color are updated afterwards (no per-tick        |
//| recreation). All objects share a unique prefix and only objects  |
//| with that prefix are ever deleted by this module.                |
//+------------------------------------------------------------------+
#property strict

//--- Flat, display-ready snapshot handed to the dashboard each redraw
struct SDashboardData
  {
   string   symbol;
   string   timeframe_label;
   string   expiry_label;
   string   regime_label;

   string   trend_entry_label;      // e.g. "M1 Trend"
   string   trend_entry_value;      // "BULLISH" / "BEARISH" / "FLAT"
   string   trend_confirm_label;    // e.g. "M5 Trend"
   string   trend_confirm_value;
   string   trend_trend_label;      // e.g. "M15 Trend"
   string   trend_trend_value;

   string   volatility_label;       // e.g. "NORMAL" / "HIGH" / "LOW"

   double   call_score;
   double   put_score;
   double   confidence;
   double   confidence_threshold;

   string   blocking_filters;       // "NONE" or semicolon-separated active filters

   string   current_signal;         // "CALL" / "PUT" / "NONE" / "NO TRADE"
   string   last_signal_result;     // "WIN" / "LOSS" / "DRAW" / "N/A"

   int      total_settled;
   int      wins;
   int      losses;
   int      draws;
   string   win_rate_text;          // pre-formatted, or "INSUFFICIENT SAMPLE (x/y)"

   int      consecutive_wins;
   int      consecutive_losses;
   int      max_consecutive_losses;

   int      todays_signals;
   double   session_win_rate;

   string   data_feed_status;       // "LIVE" / "STALE" / "DISCONNECTED" / "N/A"
   string   auto_trading_status;    // "DISABLED" / "ENABLED (DEMO)" / "ENABLED (LIVE)"
  };

//+------------------------------------------------------------------+
//| CDashboard                                                        |
//+------------------------------------------------------------------+
class CDashboard
  {
private:
   long              m_chart_id;
   string            m_prefix;
   int               m_x;
   int               m_y_start;
   int               m_line_height;
   int               m_font_size;
   string            m_font;
   int               m_panel_width;
   int               m_row_count;
   bool              m_initialized;

   void              EnsureLabel(const string name, const int x, const int y, const string text,
                                  const color clr, const int size, const bool bold);
   void              EnsureRect(const string name, const int x, const int y, const int width, const int height);
   color             ColorForBoolean(const bool positive) const;
   color             ColorForWinRate(const bool sufficient, const double rate) const;

public:
                     CDashboard(void);

   bool              Init(const long chart_id, const string prefix, const int x, const int y, const int font_size);
   void              Deinit(void);
   void              Render(const SDashboardData &data);
  };

//+------------------------------------------------------------------+
CDashboard::CDashboard(void)
  {
   m_chart_id    = 0;
   m_prefix      = "OTCP_DASH_";
   m_x           = 12;
   m_y_start     = 20;
   m_line_height = 15;
   m_font_size   = 8;
   m_font        = "Consolas";
   m_panel_width = 260;
   m_row_count   = 0;
   m_initialized = false;
  }

//+------------------------------------------------------------------+
bool CDashboard::Init(const long chart_id, const string prefix, const int x, const int y, const int font_size)
  {
   m_chart_id  = chart_id;
   m_prefix    = prefix;
   m_x         = x;
   m_y_start   = y;
   m_font_size = (font_size > 0) ? font_size : 8;
   m_line_height = m_font_size + 7;
   m_initialized = true;
   return(true);
  }

//+------------------------------------------------------------------+
void CDashboard::Deinit(void)
  {
   int total = ObjectsTotal(m_chart_id, 0, -1);
   for(int i = total - 1; i >= 0; i--)
     {
      string name = ObjectName(m_chart_id, i, 0, -1);
      if(StringFind(name, m_prefix) == 0)
         ObjectDelete(m_chart_id, name);
     }
   m_initialized = false;
  }

//+------------------------------------------------------------------+
void CDashboard::EnsureRect(const string name, const int x, const int y, const int width, const int height)
  {
   if(ObjectFind(m_chart_id, name) < 0)
     {
      ObjectCreate(m_chart_id, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(m_chart_id, name, OBJPROP_CORNER, CORNER_RIGHT_UPPER);
      ObjectSetInteger(m_chart_id, name, OBJPROP_XDISTANCE, x);
      ObjectSetInteger(m_chart_id, name, OBJPROP_YDISTANCE, y);
      ObjectSetInteger(m_chart_id, name, OBJPROP_XSIZE, width);
      ObjectSetInteger(m_chart_id, name, OBJPROP_YSIZE, height);
      ObjectSetInteger(m_chart_id, name, OBJPROP_BGCOLOR, C'18,18,20');
      ObjectSetInteger(m_chart_id, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(m_chart_id, name, OBJPROP_COLOR, clrDimGray);
      ObjectSetInteger(m_chart_id, name, OBJPROP_STYLE, STYLE_SOLID);
      ObjectSetInteger(m_chart_id, name, OBJPROP_WIDTH, 1);
      ObjectSetInteger(m_chart_id, name, OBJPROP_BACK, false);
      ObjectSetInteger(m_chart_id, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(m_chart_id, name, OBJPROP_SELECTED, false);
      ObjectSetInteger(m_chart_id, name, OBJPROP_HIDDEN, true);
     }
  }

//+------------------------------------------------------------------+
void CDashboard::EnsureLabel(const string name, const int x, const int y, const string text,
                              const color clr, const int size, const bool bold)
  {
   if(ObjectFind(m_chart_id, name) < 0)
     {
      ObjectCreate(m_chart_id, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(m_chart_id, name, OBJPROP_CORNER, CORNER_RIGHT_UPPER);
      ObjectSetInteger(m_chart_id, name, OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
      ObjectSetInteger(m_chart_id, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(m_chart_id, name, OBJPROP_SELECTED, false);
      ObjectSetInteger(m_chart_id, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(m_chart_id, name, OBJPROP_BACK, false);
     }
   ObjectSetInteger(m_chart_id, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(m_chart_id, name, OBJPROP_YDISTANCE, y);
   ObjectSetString(m_chart_id, name, OBJPROP_TEXT, text);
   ObjectSetString(m_chart_id, name, OBJPROP_FONT, bold ? m_font + " Bold" : m_font);
   ObjectSetInteger(m_chart_id, name, OBJPROP_FONTSIZE, size);
   ObjectSetInteger(m_chart_id, name, OBJPROP_COLOR, clr);
  }

//+------------------------------------------------------------------+
color CDashboard::ColorForBoolean(const bool positive) const
  {
   return(positive ? clrLimeGreen : clrTomato);
  }

//+------------------------------------------------------------------+
color CDashboard::ColorForWinRate(const bool sufficient, const double rate) const
  {
   if(!sufficient)
      return(clrGoldenrod);
   if(rate >= 60.0)
      return(clrLimeGreen);
   if(rate >= 45.0)
      return(clrKhaki);
   return(clrTomato);
  }

//+------------------------------------------------------------------+
//| Render the full panel. Objects are updated in place - none are   |
//| recreated unless they do not yet exist on the chart.             |
//+------------------------------------------------------------------+
void CDashboard::Render(const SDashboardData &data)
  {
   if(!m_initialized)
      return;

   int row = 0;
   int panel_height = 0;

   //--- pre-compute row count for background panel sizing (fixed, known layout below)
   const int total_rows = 24;
   panel_height = m_y_start / 2 + total_rows * m_line_height + 10;
   EnsureRect(m_prefix + "BG", m_x - 10, 4, m_panel_width, panel_height);

   color header_clr = clrDodgerBlue;
   color text_clr   = clrWhiteSmoke;
   color muted_clr  = clrSilver;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               "== OTC PRECISION SIGNAL SYSTEM ==", header_clr, m_font_size + 1, true); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Symbol: %s   TF: %s", data.symbol, data.timeframe_label), text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Expiry: %s", data.expiry_label), text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Regime: %s", data.regime_label), muted_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("%s: %s   %s: %s", data.trend_entry_label, data.trend_entry_value,
                            data.trend_confirm_label, data.trend_confirm_value), text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("%s: %s   Volatility: %s", data.trend_trend_label, data.trend_trend_value,
                            data.volatility_label), text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               "--------------------------------", muted_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("CALL score: %.1f   PUT score: %.1f", data.call_score, data.put_score),
               text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Confidence: %.1f (min %.1f)", data.confidence, data.confidence_threshold),
               (data.confidence >= data.confidence_threshold) ? clrLimeGreen : muted_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Blocking: %s", data.blocking_filters),
               (data.blocking_filters == "NONE") ? clrLimeGreen : clrOrange, m_font_size, false); row++;

   color signal_clr = clrSilver;
   if(data.current_signal == "CALL") signal_clr = clrLimeGreen;
   else if(data.current_signal == "PUT") signal_clr = clrTomato;
   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Current signal: %s", data.current_signal), signal_clr, m_font_size + 1, true); row++;

   color last_clr = clrSilver;
   if(data.last_signal_result == "WIN") last_clr = clrLimeGreen;
   else if(data.last_signal_result == "LOSS") last_clr = clrTomato;
   else if(data.last_signal_result == "DRAW") last_clr = clrGoldenrod;
   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Last result: %s", data.last_signal_result), last_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               "--------------------------------", muted_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Settled: %d  W:%d  L:%d  D:%d", data.total_settled, data.wins, data.losses, data.draws),
               text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Win rate: %s", data.win_rate_text),
               ColorForWinRate(StringFind(data.win_rate_text, "INSUFFICIENT") < 0, data.total_settled > 0 ? (100.0 * data.wins / MathMax(1, data.wins + data.losses)) : 0.0),
               m_font_size, true); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Consec wins: %d   Consec losses: %d", data.consecutive_wins, data.consecutive_losses),
               text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Max consec losses: %d", data.max_consecutive_losses), muted_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Today's signals: %d", data.todays_signals), text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Session win rate: %.1f%%", data.session_win_rate), text_clr, m_font_size, false); row++;

   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               "--------------------------------", muted_clr, m_font_size, false); row++;

   color feed_clr = clrSilver;
   if(data.data_feed_status == "LIVE") feed_clr = clrLimeGreen;
   else if(data.data_feed_status == "STALE" || data.data_feed_status == "DISCONNECTED") feed_clr = clrTomato;
   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Data feed: %s", data.data_feed_status), feed_clr, m_font_size, false); row++;

   color auto_clr = clrSilver;
   if(StringFind(data.auto_trading_status, "ENABLED") == 0) auto_clr = clrOrange;
   EnsureLabel(m_prefix + "R" + IntegerToString(row), m_x, m_y_start + row * m_line_height,
               StringFormat("Auto-trading: %s", data.auto_trading_status), auto_clr, m_font_size, true); row++;

   m_row_count = row;
  }
//+------------------------------------------------------------------+
