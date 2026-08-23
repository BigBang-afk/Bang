using System;
using System.Collections.Generic;
using System.Linq;
using ZarghoonJewellers.App.Models;

namespace ZarghoonJewellers.App.Repositories
{
    /// <summary>
    /// Combines the Karigar, Cash and Gold repositories into the aggregated figures used by the
    /// Dashboard, Karigar Ledger and Reports screens.
    ///
    /// Accounting convention (always from the shop's point of view):
    ///   Gold Balance = Gold Receivable - Gold Payable = (Gold Out to Karigar) - (Gold In from Karigar)
    ///   Cash Balance = Cash Receivable - Cash Payable = (Cash Out to Karigar) - (Cash In from Karigar)
    /// A positive balance means the Karigar owes the shop (Receivable); a negative balance means the
    /// shop owes the Karigar (Payable). Receivable/Payable are therefore never both non-zero at once.
    /// </summary>
    public class LedgerRepository
    {
        private readonly KarigarRepository _karigarRepo = new();
        private readonly CashTransactionRepository _cashRepo = new();
        private readonly GoldTransactionRepository _goldRepo = new();

        public KarigarSummary GetKarigarSummary(Karigar karigar, DateTime? from, DateTime? to)
        {
            decimal goldOut = _goldRepo.GetTotal(TransactionType.Out, from, to, karigar.Id);
            decimal goldIn = _goldRepo.GetTotal(TransactionType.In, from, to, karigar.Id);
            decimal cashOut = _cashRepo.GetTotal(TransactionType.Out, from, to, karigar.Id);
            decimal cashIn = _cashRepo.GetTotal(TransactionType.In, from, to, karigar.Id);

            return new KarigarSummary
            {
                KarigarId = karigar.Id,
                KarigarName = karigar.Name,
                Mobile = karigar.Mobile,
                GoldReceivable = Math.Max(goldOut - goldIn, 0),
                GoldPayable = Math.Max(goldIn - goldOut, 0),
                CashReceivable = Math.Max(cashOut - cashIn, 0),
                CashPayable = Math.Max(cashIn - cashOut, 0),
            };
        }

        public KarigarSummary GetKarigarSummary(int karigarId, DateTime? from, DateTime? to)
        {
            var karigar = _karigarRepo.GetById(karigarId);
            return karigar == null ? null : GetKarigarSummary(karigar, from, to);
        }

        /// <summary>Row-per-Karigar summary used by the Reports screen. Karigars with no matching
        /// transactions in range still appear, with zero totals.</summary>
        public List<KarigarSummary> GetAllKarigarSummaries(DateTime? from, DateTime? to, string search = null)
        {
            return _karigarRepo.GetAll(search)
                .Select(k => GetKarigarSummary(k, from, to))
                .ToList();
        }

        public DashboardSummary GetDashboardSummary(DateTime? from, DateTime? to)
        {
            var summaries = GetAllKarigarSummaries(from, to);

            return new DashboardSummary
            {
                TotalCashIn = _cashRepo.GetTotal(TransactionType.In, from, to),
                TotalCashOut = _cashRepo.GetTotal(TransactionType.Out, from, to),
                TotalGoldIn = _goldRepo.GetTotal(TransactionType.In, from, to),
                TotalGoldOut = _goldRepo.GetTotal(TransactionType.Out, from, to),
                TotalKarigars = _karigarRepo.GetAll().Count,
                TotalGoldPayable = summaries.Sum(s => s.GoldPayable),
                TotalGoldReceivable = summaries.Sum(s => s.GoldReceivable),
                TotalCashPayable = summaries.Sum(s => s.CashPayable),
                TotalCashReceivable = summaries.Sum(s => s.CashReceivable),
            };
        }

        /// <summary>Combined, chronologically ordered cash + gold ledger for one Karigar, with running balances.</summary>
        public List<LedgerEntry> GetKarigarLedger(int karigarId, DateTime? from, DateTime? to)
        {
            var cashTx = _cashRepo.GetByKarigar(karigarId, from, to);
            var goldTx = _goldRepo.GetByKarigar(karigarId, from, to);

            var rows = new List<(DateTime Date, int Id, string Type, string Description, decimal GoldIn, decimal GoldOut, decimal CashIn, decimal CashOut, string Notes)>();

            foreach (var c in cashTx)
            {
                rows.Add((
                    c.Date, c.Id, c.Type == TransactionType.In ? "Cash In" : "Cash Out",
                    c.Description,
                    0m, 0m,
                    c.Type == TransactionType.In ? c.Amount : 0m,
                    c.Type == TransactionType.Out ? c.Amount : 0m,
                    c.Notes));
            }

            foreach (var g in goldTx)
            {
                string description = string.IsNullOrWhiteSpace(g.Description)
                    ? $"Purity: {g.Purity}"
                    : $"{g.Description} ({g.Purity})";

                rows.Add((
                    g.Date, g.Id, g.Type == TransactionType.In ? "Gold In" : "Gold Out",
                    description,
                    g.Type == TransactionType.In ? g.Weight : 0m,
                    g.Type == TransactionType.Out ? g.Weight : 0m,
                    0m, 0m,
                    g.Notes));
            }

            var ordered = rows.OrderBy(r => r.Date).ThenBy(r => r.Type).ThenBy(r => r.Id).ToList();

            var result = new List<LedgerEntry>();
            decimal goldBalance = 0m;
            decimal cashBalance = 0m;

            foreach (var row in ordered)
            {
                goldBalance += row.GoldOut - row.GoldIn;
                cashBalance += row.CashOut - row.CashIn;

                result.Add(new LedgerEntry
                {
                    Date = row.Date,
                    TransactionType = row.Type,
                    Description = row.Description,
                    GoldIn = row.GoldIn,
                    GoldOut = row.GoldOut,
                    GoldBalance = goldBalance,
                    CashIn = row.CashIn,
                    CashOut = row.CashOut,
                    CashBalance = cashBalance,
                    Notes = row.Notes,
                });
            }

            return result;
        }
    }
}
