using JxFinance.Common;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Transfers;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
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
    (AccountId Account, Currency Currency)? funding,
    InvestmentSource source = InvestmentSource.InteractiveBrokers)
{
    private readonly string refPrefix = source == InvestmentSource.InteractiveBrokers ? "ibkr:" : "csv:";

    private string TradeRefPrefix => refPrefix + "t:";

    private string CashRefPrefix => refPrefix + "c:";

    private string ActionRefPrefix => refPrefix + "ca:";

    internal const int MaxRefLength = 64;
    internal static readonly string[] SecurityCategories = ["STK", "FUND"];
    private const decimal QuantityTolerance = 0.0001m;

    private static readonly (string Marker, InvestmentTransactionType Type)[] CashTypes =
    [
        ("Withholding Tax", InvestmentTransactionType.WithholdingTax),
        ("Dividend", InvestmentTransactionType.Dividend),
        ("Interest Received", InvestmentTransactionType.Interest),
        ("Interest Paid", InvestmentTransactionType.Fee),
        ("Fees", InvestmentTransactionType.Fee),
        ("Commission Adjustments", InvestmentTransactionType.Fee),
    ];

    private readonly StatementCounts counts = new() { Skipped = statement.Unreadable };
    private readonly StatementSecurities securities = new(db);
    private readonly StatementEntries entries = new(db, rates, transfers, account, source);
    private HashSet<string> entryRefs = [];
    private HashSet<string> conversionRefs = [];
    private HashSet<string> transferRefs = [];

    public async Task<Result<BrokerImportResponse>> RunAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(account.Value, cancellationToken);

        await LoadAsync(cancellationToken);

        var error = await new StatementCorporateActions(statement, ActionRefPrefix, securities, entries, entryRefs, counts).ImportAsync(cancellationToken)
            ?? await ImportTradesAsync(cancellationToken)
            ?? await ImportCashTransactionsAsync(cancellationToken);
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
            securities.Created,
            counts.PricesUpdated,
            counts.Splits,
            counts.CorporateActions,
            counts.SkippedActions
                .OrderBy(a => a.Key, StringComparer.Ordinal)
                .Select(a => new SkippedCorporateActionResponse(a.Key, a.Value))
                .ToList(),
            mismatches)
        {
            CostSharesMissing = counts.CostSharesMissing,
        };
    }

    private async Task SummariseAsync(CancellationToken cancellationToken)
    {
        var total = counts.Trades + counts.CashEntries + counts.Conversions + counts.Transfers + counts.Splits + counts.CorporateActions;
        if (total == 0)
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
                (counts.Splits, "split", "splits"),
                (counts.CorporateActions, "corporate action", "corporate actions")),
            total,
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
        await securities.LoadAsync(cancellationToken);
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
                    error = await entries.AddConversionAsync(reference, trade, baseCurrency, cancellationToken);
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
                var security = securities.Resolve(trade.Instrument);
                error = await entries.AddEntryAsync(
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
                    error = await entries.AddEntryAsync(
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
                else if (await entries.AddTransferAsync(reference, entry, funding.Value, cancellationToken) is { } error)
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
                    ? securities.Resolve(instrument)
                    : null;
                var error = await entries.AddEntryAsync(
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
            .Select(p => (Security: securities.Find(p.Instrument), p.Date, p.MarkPrice))
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
            if (SecurityPriceBook.Record(db, security!, date, markPrice, PriceSourceKind.Broker, recorded.GetValueOrDefault((security!.Id, date))))
            {
                counts.PricesUpdated++;
            }
        }
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
        var history = await db.InvestmentTransactions
            .Where(t => t.AccountId == account && t.Date <= asOf && Portfolio.PositionTypes.Contains(t.Type))
            .ToListAsync(cancellationToken);
        var replayed = Portfolio.Positions(history).ToDictionary(p => p.Key, p => p.Value.Quantity);

        var quantities = new Dictionary<(string Symbol, Currency Currency), (decimal Broker, decimal Replayed)>();
        foreach (var position in reported)
        {
            var security = securities.Find(position.Instrument);
            var key = (security?.Symbol ?? position.Instrument.Symbol.ToUpperInvariant(), position.Instrument.Currency);
            var held = security is null ? 0m : replayed.GetValueOrDefault(security.Id);
            quantities[key] = (quantities.GetValueOrDefault(key).Broker + position.Quantity!.Value, held);
        }

        foreach (var (securityId, quantity) in replayed.Where(p => p.Value != 0m))
        {
            var security = securities.Get(securityId);
            quantities.TryAdd((security.Symbol, security.Currency), (0m, quantity));
        }

        return quantities
            .Where(q => Math.Abs(q.Value.Broker - q.Value.Replayed) > QuantityTolerance)
            .OrderBy(q => q.Key.Symbol, StringComparer.Ordinal)
            .Select(q => new PositionMismatchResponse(q.Key.Symbol, q.Value.Broker, decimal.Round(q.Value.Replayed, 8)))
            .ToList();
    }
}

internal sealed class StatementCounts
{
    public int Trades { get; set; }
    public int CashEntries { get; set; }
    public int Conversions { get; set; }
    public int Transfers { get; set; }
    public int Duplicates { get; set; }
    public int Skipped { get; set; }
    public int PricesUpdated { get; set; }
    public int Splits { get; set; }
    public int CorporateActions { get; set; }
    public List<string> CostSharesMissing { get; } = [];
    public Dictionary<string, int> SkippedActions { get; } = [];
}
