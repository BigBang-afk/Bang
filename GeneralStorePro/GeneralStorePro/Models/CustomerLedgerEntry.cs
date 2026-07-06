using System;

namespace GeneralStorePro.Models;

public sealed record CustomerLedgerEntry(
    DateTime Date,
    string Type,
    string Reference,
    decimal Debit,
    decimal Credit,
    decimal RunningBalance);
