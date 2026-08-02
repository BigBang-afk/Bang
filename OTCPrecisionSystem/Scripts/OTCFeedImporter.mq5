//+------------------------------------------------------------------+
//|                                          OTCFeedImporter.mq5     |
//|                          OTC Precision Signal System             |
//|                                                                    |
//| Imports price data from a DOCUMENTED, AUTHORIZED local CSV feed  |
//| into an MT5 custom symbol using only official custom-symbol      |
//| API functions (CustomSymbolCreate / CustomTicksAdd /             |
//| CustomRatesUpdate, etc). This script contains NO Quotex login,   |
//| cookie, token, scraping, or browser-automation code of any kind, |
//| and never will. It only ever reads a local file that YOU (the    |
//| user) populate from a data source you are legally authorized to |
//| use - for example an export from your own authorized data        |
//| provider, or the companion authorized_feed_bridge.py script.     |
//|                                                                    |
//| Expected CSV file location: <Terminal Data Folder>\MQL5\Files\   |
//| Ticks format   (InpFeedFormat = FEED_FORMAT_TICKS):               |
//|   yyyy-mm-dd hh:mi:ss,bid,ask[,volume]                            |
//| Bars format    (InpFeedFormat = FEED_FORMAT_BARS):                 |
//|   yyyy-mm-dd hh:mi:ss,open,high,low,close[,volume]                |
//| All timestamps in the file MUST be UTC.                          |
//+------------------------------------------------------------------+
#property copyright "OTC Precision Signal System"
#property link      ""
#property version   "1.00"
#property strict
#property script_show_inputs

enum ENUM_FEED_FORMAT
  {
   FEED_FORMAT_TICKS = 0,
   FEED_FORMAT_BARS  = 1
  };

//====================================================================
// INPUTS
//====================================================================
input string   Inp_Feed                        = "==== Authorized Feed ====";
input string   InpCustomSymbolName              = "OTC.AUTH.EURUSD";   // Custom symbol name to create/update
input string   InpBaseSymbolForSpecs            = "EURUSD";            // Broker symbol to copy specs from (blank = manual)
input string   InpFeedFilePath                  = "OTCFeed\\EURUSD_feed.csv"; // File under MQL5\Files\
input ENUM_FEED_FORMAT InpFeedFormat            = FEED_FORMAT_TICKS;
input int      InpManualDigits                   = 5;                  // Used only if InpBaseSymbolForSpecs is blank
input string   InpCustomSymbolDescription       = "Authorized OTC feed (custom symbol)";
input string   InpCustomSymbolPath              = "OTC Authorized";

input string   Inp_Validation                  = "==== Validation ====";
input int      InpMaxRowsPerRun                 = 200000;              // Safety cap on rows processed per run
input int      InpStaleFeedMinutes              = 15;                  // Warn if last row older than this
input bool     InpRejectOutOfOrder              = true;                // Reject non-ascending timestamps
input bool     InpRejectDuplicates              = true;                // Reject duplicate timestamps

input string   Inp_Run                         = "==== Run Mode ====";
input bool     InpRunContinuously               = false;               // Poll the file repeatedly instead of one-shot
input int      InpPollIntervalSeconds           = 5;                   // Poll interval (continuous mode only)
input int      InpMaxPollCycles                 = 720;                 // Safety cap on poll cycles (continuous mode)

input string   Inp_Logging                     = "==== Logging ====";
input string   InpLogFileName                   = "OTCFeed\\OTCFeedImporter_log.txt";

//====================================================================
// GLOBALS
//====================================================================
int      g_log_handle = INVALID_HANDLE;
long     g_last_processed_line = 0;
datetime g_last_imported_time = 0;

//+------------------------------------------------------------------+
void LogLine(const string text)
  {
   string stamped = TimeToString(TimeGMT(), TIME_DATE | TIME_SECONDS) + " UTC | " + text;
   Print("OTCFeedImporter: " + stamped);
   if(g_log_handle != INVALID_HANDLE)
     {
      FileSeek(g_log_handle, 0, SEEK_END);
      FileWriteString(g_log_handle, stamped + "\r\n");
      FileFlush(g_log_handle);
     }
  }

//+------------------------------------------------------------------+
bool EnsureCustomSymbol(void)
  {
   if(SymbolSelect(InpCustomSymbolName, false) && SymbolInfoInteger(InpCustomSymbolName, SYMBOL_CUSTOM))
     {
      LogLine("Custom symbol already exists: " + InpCustomSymbolName);
      return(true);
     }

   string origin = (StringLen(InpBaseSymbolForSpecs) > 0) ? InpBaseSymbolForSpecs : NULL;
   if(origin != NULL && !SymbolSelect(origin, true))
     {
      LogLine(StringFormat("WARNING: base symbol '%s' not available, falling back to manual specification", origin));
      origin = NULL;
     }

   if(!CustomSymbolCreate(InpCustomSymbolName, InpCustomSymbolPath, origin))
     {
      LogLine(StringFormat("ERROR: CustomSymbolCreate failed for '%s' (err=%d)", InpCustomSymbolName, GetLastError()));
      return(false);
     }

   CustomSymbolSetString(InpCustomSymbolName, SYMBOL_DESCRIPTION, InpCustomSymbolDescription);

   if(origin == NULL)
     {
      CustomSymbolSetInteger(InpCustomSymbolName, SYMBOL_DIGITS, InpManualDigits);
      CustomSymbolSetInteger(InpCustomSymbolName, SYMBOL_TRADE_MODE, SYMBOL_TRADE_MODE_DISABLED);
      CustomSymbolSetDouble(InpCustomSymbolName, SYMBOL_TRADE_TICK_SIZE, MathPow(10.0, -InpManualDigits));
      CustomSymbolSetDouble(InpCustomSymbolName, SYMBOL_TRADE_TICK_VALUE, 1.0);
      CustomSymbolSetDouble(InpCustomSymbolName, SYMBOL_TRADE_CONTRACT_SIZE, 100000.0);
      CustomSymbolSetDouble(InpCustomSymbolName, SYMBOL_VOLUME_MIN, 0.01);
      CustomSymbolSetDouble(InpCustomSymbolName, SYMBOL_VOLUME_MAX, 100.0);
      CustomSymbolSetDouble(InpCustomSymbolName, SYMBOL_VOLUME_STEP, 0.01);
     }

   //--- statistics/signal use only - trading is intentionally left disabled on the custom symbol
   CustomSymbolSetInteger(InpCustomSymbolName, SYMBOL_TRADE_MODE, SYMBOL_TRADE_MODE_DISABLED);

   if(!SymbolSelect(InpCustomSymbolName, true))
     {
      LogLine("ERROR: failed to select newly created custom symbol");
      return(false);
     }

   LogLine("Created custom symbol: " + InpCustomSymbolName);
   return(true);
  }

//+------------------------------------------------------------------+
//| Parse a single CSV line into fields (comma-separated).           |
//+------------------------------------------------------------------+
int SplitCsvLine(const string line, string &fields[])
  {
   return(StringSplit(line, ',', fields));
  }

//+------------------------------------------------------------------+
datetime ParseUtcTimestamp(const string text)
  {
   string t = text;
   StringTrimLeft(t);
   StringTrimRight(t);
   StringReplace(t, "T", " ");
   StringReplace(t, "-", ".");
   return(StringToTime(t));
  }

//+------------------------------------------------------------------+
//| Import tick-format rows and push them via CustomTicksAdd.        |
//+------------------------------------------------------------------+
bool ImportTicks(const int file_handle, int &imported, int &rejected)
  {
   imported = 0; rejected = 0;
   MqlTick ticks[];
   int batch = 0;
   datetime prev_time = g_last_imported_time;
   long prev_time_msc = 0;

   ArrayResize(ticks, 0);

   int line_no = 0;
   while(!FileIsEnding(file_handle) && line_no < InpMaxRowsPerRun)
     {
      string line = FileReadString(file_handle);
      line_no++;
      if(StringLen(line) == 0)
         continue;

      string fields[];
      int n = SplitCsvLine(line, fields);
      if(n < 3)
        {
         LogLine(StringFormat("Malformed tick row skipped (line %d): %s", line_no, line));
         rejected++;
         continue;
        }

      datetime t = ParseUtcTimestamp(fields[0]);
      double bid = StringToDouble(fields[1]);
      double ask = StringToDouble(fields[2]);
      double vol = (n >= 4) ? StringToDouble(fields[3]) : 0.0;

      if(t == 0 || bid <= 0.0 || ask <= 0.0 || ask < bid)
        {
         LogLine(StringFormat("Invalid tick data skipped (line %d): %s", line_no, line));
         rejected++;
         continue;
        }

      if(InpRejectOutOfOrder && t < prev_time)
        {
         LogLine(StringFormat("Out-of-order timestamp rejected (line %d): %s", line_no, line));
         rejected++;
         continue;
        }

      if(InpRejectDuplicates && t == prev_time && batch > 0)
        {
         LogLine(StringFormat("Duplicate timestamp rejected (line %d): %s", line_no, line));
         rejected++;
         continue;
        }

      int idx = ArraySize(ticks);
      ArrayResize(ticks, idx + 1);
      ZeroMemory(ticks[idx]);
      ticks[idx].time      = t;
      ticks[idx].time_msc   = (long)t * 1000;
      ticks[idx].bid        = bid;
      ticks[idx].ask        = ask;
      ticks[idx].last       = 0.0;
      ticks[idx].volume     = (ulong)MathMax(0.0, vol);
      ticks[idx].flags      = TICK_FLAG_BID | TICK_FLAG_ASK;

      prev_time = t;
      batch++;
     }

   if(batch == 0)
     {
      imported = 0;
      return(true);
     }

   int added = CustomTicksAdd(InpCustomSymbolName, ticks);
   if(added < 0)
     {
      LogLine(StringFormat("ERROR: CustomTicksAdd failed (err=%d)", GetLastError()));
      return(false);
     }

   imported = added;
   g_last_imported_time = prev_time;
   return(true);
  }

//+------------------------------------------------------------------+
//| Import bar-format rows and push them via CustomRatesUpdate.      |
//+------------------------------------------------------------------+
bool ImportBars(const int file_handle, int &imported, int &rejected)
  {
   imported = 0; rejected = 0;
   MqlRates rates[];
   ArrayResize(rates, 0);

   datetime prev_time = g_last_imported_time;
   int line_no = 0;
   int batch = 0;

   while(!FileIsEnding(file_handle) && line_no < InpMaxRowsPerRun)
     {
      string line = FileReadString(file_handle);
      line_no++;
      if(StringLen(line) == 0)
         continue;

      string fields[];
      int n = SplitCsvLine(line, fields);
      if(n < 5)
        {
         LogLine(StringFormat("Malformed bar row skipped (line %d): %s", line_no, line));
         rejected++;
         continue;
        }

      datetime t = ParseUtcTimestamp(fields[0]);
      double o = StringToDouble(fields[1]);
      double h = StringToDouble(fields[2]);
      double l = StringToDouble(fields[3]);
      double c = StringToDouble(fields[4]);
      long   v = (n >= 6) ? (long)StringToInteger(fields[5]) : 0;

      if(t == 0 || o <= 0.0 || h <= 0.0 || l <= 0.0 || c <= 0.0 || h < l || h < o || h < c || l > o || l > c)
        {
         LogLine(StringFormat("Invalid bar data skipped (line %d): %s", line_no, line));
         rejected++;
         continue;
        }

      if(InpRejectOutOfOrder && t < prev_time)
        {
         LogLine(StringFormat("Out-of-order bar timestamp rejected (line %d): %s", line_no, line));
         rejected++;
         continue;
        }
      if(InpRejectDuplicates && t == prev_time && batch > 0)
        {
         LogLine(StringFormat("Duplicate bar timestamp rejected (line %d): %s", line_no, line));
         rejected++;
         continue;
        }

      int idx = ArraySize(rates);
      ArrayResize(rates, idx + 1);
      ZeroMemory(rates[idx]);
      rates[idx].time   = t;
      rates[idx].open    = o;
      rates[idx].high    = h;
      rates[idx].low     = l;
      rates[idx].close   = c;
      rates[idx].tick_volume = (v > 0) ? v : 0;
      rates[idx].real_volume = 0;
      rates[idx].spread       = 0;

      prev_time = t;
      batch++;
     }

   if(batch == 0)
     {
      imported = 0;
      return(true);
     }

   int added = CustomRatesUpdate(InpCustomSymbolName, rates);
   if(added < 0)
     {
      LogLine(StringFormat("ERROR: CustomRatesUpdate failed (err=%d)", GetLastError()));
      return(false);
     }

   imported = added;
   g_last_imported_time = prev_time;
   return(true);
  }

//+------------------------------------------------------------------+
void CheckStaleness(void)
  {
   if(g_last_imported_time == 0)
     {
      LogLine("No data imported yet - cannot assess feed staleness.");
      return;
     }
   long minutes_old = (long)((TimeGMT() - g_last_imported_time) / 60);
   if(minutes_old > InpStaleFeedMinutes)
     {
      string warn = StringFormat("STALE FEED WARNING: last imported timestamp is %d minute(s) old (limit %d).",
                                  (int)minutes_old, InpStaleFeedMinutes);
      LogLine(warn);
      Comment("OTCFeedImporter [" + InpCustomSymbolName + "]\n" + warn);
     }
   else
     {
      Comment(StringFormat("OTCFeedImporter [%s]\nFeed OK - last update %d minute(s) ago.",
                            InpCustomSymbolName, (int)minutes_old));
     }
  }

//+------------------------------------------------------------------+
bool RunOneImportCycle(void)
  {
   if(!FileIsExist(InpFeedFilePath))
     {
      LogLine("ERROR: feed file not found: " + InpFeedFilePath);
      return(false);
     }

   int handle = FileOpen(InpFeedFilePath, FILE_READ | FILE_TXT | FILE_ANSI | FILE_SHARE_READ | FILE_SHARE_WRITE);
   if(handle == INVALID_HANDLE)
     {
      LogLine(StringFormat("ERROR: could not open feed file '%s' (err=%d)", InpFeedFilePath, GetLastError()));
      return(false);
     }

   //--- skip lines already processed on a previous poll cycle
   for(long i = 0; i < g_last_processed_line && !FileIsEnding(handle); i++)
      FileReadString(handle);

   int imported = 0, rejected = 0;
   bool ok = (InpFeedFormat == FEED_FORMAT_TICKS) ? ImportTicks(handle, imported, rejected)
                                                    : ImportBars(handle, imported, rejected);

   g_last_processed_line += imported + rejected;
   FileClose(handle);

   if(ok)
      LogLine(StringFormat("Import cycle complete. Imported=%d Rejected=%d TotalLinesSeen=%d",
                            imported, rejected, (int)g_last_processed_line));

   CheckStaleness();
   return(ok);
  }

//+------------------------------------------------------------------+
void OnStart(void)
  {
   if(!FolderCreate("OTCFeed"))
      { /* folder may already exist - not fatal */ }

   g_log_handle = FileOpen(InpLogFileName, FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_SHARE_READ);
   if(g_log_handle == INVALID_HANDLE)
      Print("OTCFeedImporter: WARNING - could not open log file, continuing with terminal log only.");

   LogLine("=== OTC Feed Importer starting ===");
   LogLine("Custom symbol: " + InpCustomSymbolName + "  Format: " + EnumToString(InpFeedFormat));
   LogLine("Feed file: " + InpFeedFilePath);

   if(!EnsureCustomSymbol())
     {
      LogLine("FATAL: could not create/select custom symbol - aborting.");
      if(g_log_handle != INVALID_HANDLE) FileClose(g_log_handle);
      return;
     }

   if(!InpRunContinuously)
     {
      RunOneImportCycle();
     }
   else
     {
      int cycles = 0;
      while(!IsStopped() && cycles < InpMaxPollCycles)
        {
         RunOneImportCycle();
         cycles++;
         Sleep(MathMax(1, InpPollIntervalSeconds) * 1000);
        }
      LogLine(StringFormat("Continuous polling ended after %d cycle(s).", cycles));
     }

   LogLine("=== OTC Feed Importer finished ===");
   if(g_log_handle != INVALID_HANDLE)
     {
      FileClose(g_log_handle);
      g_log_handle = INVALID_HANDLE;
     }
  }
//+------------------------------------------------------------------+
