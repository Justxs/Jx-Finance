using JxFinance.Common;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Transfers;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Investments.Services;

public sealed class StatementImport(
    AppDbContext db,
    IExchangeRateService rates,
    ITransferAmountResolver transfers,
    FlexStatement statement,
    AccountId account,
    AccountId? funding)
{
    private const string TradeRefPrefix = "ibkr:t:";
    private const string CashRefPrefix = "ibkr:c:";
    private const string ActionRefPrefix = "ibkr:ca:";
    private const int MaxRefLength = 64;
    private const int MaxDescriptionLength = 500;
    private const decimal QuantityTolerance = 0.0001m;
    private static readonly string[] SecurityCategories = ["STK", "FUND"];

    private static readonly InvestmentTransactionType[] ReplayedTypes =
    [
        InvestmentTransactionType.Buy,
        InvestmentTransactionType.Sell,
        InvestmentTransactionType.Split,
    ];

    private static readonly (string Marker, InvestmentTransactionType Type)[] CashTypes =
    [
        ("Withholding Tax", InvestmentTransactionType.WithholdingTax),
        ("Dividend", InvestmentTransactionType.Dividend),
        ("Interest Received", InvestmentTransactionType.Interest),
        ("Interest Paid", InvestmentTransactionType.Fee),
        ("Fees", InvestmentTransactionType.Fee),
        ("Commission Adjustments", InvestmentTransactionType.Fee),
    ];

    private readonly Counts counts = new() { Skipped = statement.Unreadable };
    private readonly Dictionary<long, Security> renamedContracts = [];
    private readonly Dictionary<(string Isin, Currency Currency), Security> renamedIsins = [];
    private HashSet<string> entryRefs = [];
    private HashSet<string> conversionRefs = [];
    private HashSet<string> transferRefs = [];
    private List<Security> securities = [];

    public async Task<Result<BrokerImportResponse>> RunAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(account.Value, cancellationToken);

        await LoadAsync(cancellationToken);
        ImportCorporateActions();

        var error = await ImportTradesAsync(cancellationToken) ?? await ImportCashTransactionsAsync(cancellationToken);
        if (error is not null)
        {
            return error;
        }

        await UpdatePricesAsync(cancellationToken);

        await SummariseAsync(cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var mismatches = await ComparePositionsAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new BrokerImportResponse(
            counts.Trades,
            counts.CashEntries,
            counts.Conversions,
            counts.Transfers,
            counts.Duplicates,
            counts.Skipped,
            counts.SecuritiesCreated,
            counts.PricesUpdated,
            counts.Splits,
            counts.SkippedActions
                .OrderBy(a => a.Key, StringComparer.Ordinal)
                .Select(a => new SkippedCorporateActionResponse(a.Key, a.Value))
                .ToList(),
            mismatches);
    }

    private async Task SummariseAsync(CancellationToken cancellationToken)
    {
        var entries = counts.Trades + counts.CashEntries + counts.Conversions + counts.Transfers + counts.Splits;
        if (entries == 0)
        {
            return;
        }

        var name = await db.Accounts.IgnoreQueryFilters()
            .Where(a => a.Id == account)
            .Select(a => a.Name)
            .FirstAsync(cancellationToken);
        db.Audit.Summarise(
            AuditAction.Imported,
            AuditEntityKind.InvestmentTransaction,
            TrashLabel.Counted(
                $"Interactive Brokers statement into {name}",
                (counts.Trades, "trade", "trades"),
                (counts.CashEntries, "cash entry", "cash entries"),
                (counts.Conversions, "conversion", "conversions"),
                (counts.Transfers, "transfer", "transfers"),
                (counts.Splits, "split", "splits")),
            entries,
            account.Value,
            [account]);
    }

    private async Task LoadAsync(CancellationToken cancellationToken)
    {
        entryRefs = (await db.InvestmentTransactions.IgnoreQueryFilters()
            .Where(t => t.AccountId == account && t.ExternalId != null)
            .Select(t => t.ExternalId!)
            .ToListAsync(cancellationToken)).ToHashSet();
        conversionRefs = (await db.CurrencyConversions.IgnoreQueryFilters()
            .Where(c => c.AccountId == account && c.ImportRef != null)
            .Select(c => c.ImportRef!)
            .ToListAsync(cancellationToken)).ToHashSet();
        transferRefs = (await db.TransferImports
            .Where(r => r.AccountId == account)
            .Select(r => r.ImportRef)
            .ToListAsync(cancellationToken)).ToHashSet();
        securities = await db.Securities.ToListAsync(cancellationToken);
    }

    private void ImportCorporateActions()
    {
        foreach (var action in statement.CorporateActions.GroupBy(a => a.Id))
        {
            var rows = action.Where(a => SecurityCategories.Contains(a.Instrument.AssetCategory)).ToList();
            var reference = ActionRefPrefix + action.Key;
            var type = action.First().Type;
            if (rows.Count == 0
                || !rows[0].IsSplit
                || rows.Select(r => r.Ratio).FirstOrDefault(r => r is not null) is not { } ratio
                || reference.Length > MaxRefLength)
            {
                counts.Skipped++;
                counts.SkippedActions[type] = counts.SkippedActions.GetValueOrDefault(type) + 1;
                continue;
            }

            var successor = rows.OrderByDescending(r => r.Quantity).First().Instrument;
            var security = rows.Select(r => Find(r.Instrument)).FirstOrDefault(s => s is not null) ?? Resolve(successor);
            security.BrokerContractId = successor.ContractId ?? security.BrokerContractId;
            security.Isin = successor.Isin?.ToUpperInvariant() ?? security.Isin;
            foreach (var row in rows)
            {
                if (row.Instrument.ContractId is { } contractId)
                {
                    renamedContracts[contractId] = security;
                }

                if (row.Instrument.Isin is { } isin)
                {
                    renamedIsins[(isin.ToUpperInvariant(), row.Instrument.Currency)] = security;
                }
            }

            if (!entryRefs.Add(reference))
            {
                counts.Duplicates++;
                continue;
            }

            var description = rows[0].Description;
            AddEntry(
                reference,
                InvestmentTransactionType.Split,
                security,
                rows[0].Date,
                new Money(0m, security.Currency),
                0m,
                description is { Length: > MaxDescriptionLength } ? description[..MaxDescriptionLength] : description,
                ratio);
            counts.Splits++;
        }
    }

    private async Task<DomainError?> ImportTradesAsync(CancellationToken cancellationToken)
    {
        foreach (var trade in statement.Trades.OrderBy(t => t.Date))
        {
            var reference = TradeRefPrefix + trade.Id;
            DomainError? error = null;
            if (reference.Length > MaxRefLength - 4)
            {
                counts.Skipped++;
            }
            else if (trade.Instrument.AssetCategory == "CASH")
            {
                if (!CurrencyCode.TryParse(trade.Instrument.Symbol.Split('.')[0], out var baseCurrency))
                {
                    counts.Skipped++;
                }
                else if (!conversionRefs.Add(reference))
                {
                    counts.Duplicates++;
                }
                else
                {
                    error = await AddConversionAsync(reference, trade, baseCurrency, cancellationToken);
                    counts.Conversions++;
                }
            }
            else if (!SecurityCategories.Contains(trade.Instrument.AssetCategory))
            {
                counts.Skipped++;
            }
            else if (!entryRefs.Add(reference))
            {
                counts.Duplicates++;
            }
            else
            {
                var currency = trade.Instrument.Currency;
                var sameCurrency = trade.CommissionCurrency == currency;
                var costs = trade.Taxes + (sameCurrency ? trade.Commission : 0m);
                var security = Resolve(trade.Instrument);
                error = await AddEntryAsync(
                    reference,
                    trade.IsBuy ? InvestmentTransactionType.Buy : InvestmentTransactionType.Sell,
                    security,
                    trade.Date,
                    new Money(trade.Proceeds + costs, currency),
                    null,
                    cancellationToken,
                    Math.Abs(trade.Quantity),
                    trade.Price,
                    -costs);
                if (error is null && !sameCurrency && trade.Commission != 0m)
                {
                    error = await AddEntryAsync(
                        reference + ":fee",
                        InvestmentTransactionType.Fee,
                        security,
                        trade.Date,
                        new Money(trade.Commission, trade.CommissionCurrency),
                        $"Commission {trade.Instrument.Symbol}",
                        cancellationToken);
                }

                counts.Trades++;
            }

            if (error is not null)
            {
                return error;
            }
        }

        return null;
    }

    private async Task<DomainError?> ImportCashTransactionsAsync(CancellationToken cancellationToken)
    {
        foreach (var entry in statement.CashTransactions.OrderBy(c => c.Date))
        {
            var reference = CashRefPrefix + entry.Id;
            if (reference.Length > MaxRefLength)
            {
                counts.Skipped++;
                continue;
            }

            if (entry.Type.Contains("Deposits", StringComparison.OrdinalIgnoreCase))
            {
                if (funding is null)
                {
                    counts.Skipped++;
                }
                else if (!transferRefs.Add(reference))
                {
                    counts.Duplicates++;
                }
                else if (await AddTransferAsync(reference, entry, funding.Value, cancellationToken) is { } error)
                {
                    return error;
                }
                else
                {
                    counts.Transfers++;
                }

                continue;
            }

            var type = CashTypes
                .Where(c => entry.Type.Contains(c.Marker, StringComparison.OrdinalIgnoreCase))
                .Select(c => (InvestmentTransactionType?)c.Type)
                .FirstOrDefault();
            if (type is null)
            {
                counts.Skipped++;
            }
            else if (!entryRefs.Add(reference))
            {
                counts.Duplicates++;
            }
            else
            {
                var security = entry.Instrument is { } instrument && SecurityCategories.Contains(instrument.AssetCategory)
                    ? Resolve(instrument)
                    : null;
                var error = await AddEntryAsync(
                    reference,
                    type.Value,
                    security,
                    entry.Date,
                    new Money(entry.Amount, entry.Currency),
                    entry.Description,
                    cancellationToken);
                if (error is not null)
                {
                    return error;
                }

                counts.CashEntries++;
            }
        }

        return null;
    }

    private async Task UpdatePricesAsync(CancellationToken cancellationToken)
    {
        var marks = statement.OpenPositions
            .Where(p => SecurityCategories.Contains(p.Instrument.AssetCategory))
            .Select(p => (Security: Find(p.Instrument), p.Date, p.MarkPrice))
            .Where(m => m.Security is not null)
            .ToList();
        if (marks.Count == 0)
        {
            return;
        }

        var dates = marks.Select(m => m.Date).Distinct().ToList();
        var securityIds = marks.Select(m => m.Security!.Id).Distinct().ToList();
        var recorded = (await db.SecurityPrices
                .Where(p => dates.Contains(p.Date) && securityIds.Contains(p.SecurityId))
                .ToListAsync(cancellationToken))
            .ToDictionary(p => (p.SecurityId, p.Date));

        foreach (var (security, date, markPrice) in marks)
        {
            if (SecurityPriceBook.Record(db, security!, date, markPrice, recorded.GetValueOrDefault((security!.Id, date))))
            {
                counts.PricesUpdated++;
            }
        }
    }

    private Security? Find(FlexInstrument instrument)
    {
        var symbol = instrument.Symbol.ToUpperInvariant();
        var isin = instrument.Isin?.ToUpperInvariant();
        if (instrument.ContractId is { } contractId && renamedContracts.TryGetValue(contractId, out var renamed))
        {
            return renamed;
        }

        if (isin is not null && renamedIsins.TryGetValue((isin, instrument.Currency), out renamed))
        {
            return renamed;
        }

        return securities.FirstOrDefault(s => instrument.ContractId is not null && s.BrokerContractId == instrument.ContractId)
            ?? securities.FirstOrDefault(s => isin is not null && s.Isin == isin && s.Currency == instrument.Currency)
            ?? securities.FirstOrDefault(s => s.Symbol == symbol && s.Currency == instrument.Currency);
    }

    private Security Resolve(FlexInstrument instrument)
    {
        var security = Find(instrument);
        if (security is null)
        {
            security = new Security
            {
                Symbol = instrument.Symbol.ToUpperInvariant(),
                Name = instrument.Name,
                Isin = instrument.Isin?.ToUpperInvariant(),
                Exchange = instrument.Exchange,
                Currency = instrument.Currency,
                Type = instrument switch
                {
                    { SubCategory: "ETF" } => SecurityType.Etf,
                    { AssetCategory: "FUND" } => SecurityType.Fund,
                    _ => SecurityType.Stock,
                },
            };
            securities.Add(security);
            db.Securities.Add(security);
            counts.SecuritiesCreated++;
        }

        security.BrokerContractId ??= instrument.ContractId;
        security.Isin ??= instrument.Isin?.ToUpperInvariant();
        return security;
    }

    private async Task<DomainError?> AddEntryAsync(
        string reference,
        InvestmentTransactionType type,
        Security? security,
        DateOnly date,
        Money cash,
        string? description,
        CancellationToken cancellationToken,
        decimal quantity = 0m,
        decimal price = 0m,
        decimal fee = 0m)
    {
        var reporting = await rates.ToReportingAsync(cash, date, cancellationToken);
        if (reporting.IsFailure)
        {
            return reporting.Error;
        }

        AddEntry(reference, type, security, date, cash, reporting.Value, description, quantity, price, fee);
        return null;
    }

    private void AddEntry(
        string reference,
        InvestmentTransactionType type,
        Security? security,
        DateOnly date,
        Money cash,
        decimal reportingAmount,
        string? description,
        decimal quantity = 0m,
        decimal price = 0m,
        decimal fee = 0m)
    {
        db.InvestmentTransactions.Add(new InvestmentTransaction
        {
            AccountId = account,
            SecurityId = security?.Id,
            Type = type,
            Date = date,
            Quantity = quantity,
            Price = price,
            Fee = fee,
            CashAmount = cash,
            ReportingAmount = reportingAmount,
            Description = description,
            Source = InvestmentSource.InteractiveBrokers,
            ExternalId = reference,
        });
    }

    private async Task<DomainError?> AddTransferAsync(
        string reference,
        FlexCashTransaction entry,
        AccountId fundingAccount,
        CancellationToken cancellationToken)
    {
        var atBroker = new Money(Math.Abs(entry.Amount), entry.Currency);
        var fundingCurrency = await db.Accounts
            .Where(a => a.Id == fundingAccount)
            .Select(a => a.StartingBalance.Currency)
            .FirstAsync(cancellationToken);
        var atFunding = await rates.ConvertAsync(atBroker, fundingCurrency, entry.Date, cancellationToken);
        if (atFunding.IsFailure)
        {
            return atFunding.Error;
        }

        var draft = entry.Amount > 0
            ? new TransferDraft(fundingAccount, account, atFunding.Value, fundingCurrency, atBroker.Amount, atBroker.Currency)
            : new TransferDraft(account, fundingAccount, atBroker.Amount, atBroker.Currency, atFunding.Value, fundingCurrency);
        var amounts = await transfers.ResolveAsync(draft, [atBroker.Currency, fundingCurrency], cancellationToken);
        if (amounts.IsFailure)
        {
            return amounts.Error;
        }

        var transfer = new Transfer
        {
            FromAccountId = draft.FromAccountId,
            ToAccountId = draft.ToAccountId,
            Amount = amounts.Value!.Sent,
            ReceivedAmount = amounts.Value.Received,
            Date = entry.Date,
            Description = entry.Description,
        };
        db.Transfers.Add(transfer);
        db.TransferImports.Add(new TransferImport { AccountId = account, ImportRef = reference, TransferId = transfer.Id });
        return null;
    }

    private async Task<DomainError?> AddConversionAsync(
        string reference,
        FlexTrade trade,
        Currency baseCurrency,
        CancellationToken cancellationToken)
    {
        var inBase = new Money(Math.Abs(trade.Quantity), baseCurrency);
        var inQuote = new Money(Math.Abs(trade.Proceeds), trade.Instrument.Currency);

        Transaction? fee = null;
        if (trade.Commission < 0m)
        {
            var amount = new Money(-trade.Commission, trade.CommissionCurrency);
            var reporting = await rates.ToReportingAsync(amount, trade.Date, cancellationToken);
            if (reporting.IsFailure)
            {
                return reporting.Error;
            }

            fee = new Transaction
            {
                AccountId = account,
                Type = FlowType.Expense,
                Amount = amount,
                ReportingAmount = reporting.Value,
                Date = trade.Date,
                Description = $"Conversion fee {trade.Instrument.Symbol}",
                Source = TransactionSource.Imported,
            };
            db.Transactions.Add(fee);
        }

        db.CurrencyConversions.Add(new CurrencyConversion
        {
            AccountId = account,
            FromAmount = trade.IsBuy ? inQuote : inBase,
            ToAmount = trade.IsBuy ? inBase : inQuote,
            Date = trade.Date,
            FeeTransactionId = fee?.Id,
            ImportRef = reference,
        });
        return null;
    }

    private async Task<IReadOnlyList<PositionMismatchResponse>?> ComparePositionsAsync(CancellationToken cancellationToken)
    {
        var reported = statement.OpenPositions
            .Where(p => p.Quantity is not null && SecurityCategories.Contains(p.Instrument.AssetCategory))
            .ToList();
        if (reported.Count == 0)
        {
            return null;
        }

        var asOf = reported.Max(p => p.Date);
        var entries = await db.InvestmentTransactions
            .Where(t => t.AccountId == account && t.Date <= asOf && ReplayedTypes.Contains(t.Type))
            .ToListAsync(cancellationToken);
        var replayed = Portfolio.Positions(entries).ToDictionary(p => p.Key, p => p.Value.Quantity);

        var quantities = new Dictionary<(string Symbol, Currency Currency), (decimal Broker, decimal Replayed)>();
        foreach (var position in reported)
        {
            var security = Find(position.Instrument);
            var key = (security?.Symbol ?? position.Instrument.Symbol.ToUpperInvariant(), position.Instrument.Currency);
            var held = security is null ? 0m : replayed.GetValueOrDefault(security.Id);
            quantities[key] = (quantities.GetValueOrDefault(key).Broker + position.Quantity!.Value, held);
        }

        foreach (var (securityId, quantity) in replayed.Where(p => p.Value != 0m))
        {
            var security = securities.First(s => s.Id == securityId);
            quantities.TryAdd((security.Symbol, security.Currency), (0m, quantity));
        }

        return quantities
            .Where(q => Math.Abs(q.Value.Broker - q.Value.Replayed) > QuantityTolerance)
            .OrderBy(q => q.Key.Symbol, StringComparer.Ordinal)
            .Select(q => new PositionMismatchResponse(q.Key.Symbol, q.Value.Broker, decimal.Round(q.Value.Replayed, 8)))
            .ToList();
    }

    private sealed class Counts
    {
        public int Trades { get; set; }
        public int CashEntries { get; set; }
        public int Conversions { get; set; }
        public int Transfers { get; set; }
        public int Duplicates { get; set; }
        public int Skipped { get; set; }
        public int SecuritiesCreated { get; set; }
        public int PricesUpdated { get; set; }
        public int Splits { get; set; }
        public Dictionary<string, int> SkippedActions { get; } = [];
    }
}
