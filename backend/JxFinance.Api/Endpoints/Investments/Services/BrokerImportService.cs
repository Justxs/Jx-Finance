using System.Security.Cryptography;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.SaveBrokerConnection;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<IBrokerImportService>(LifeTime.Scoped)]
public sealed class BrokerImportService(
    AppDbContext db,
    IExchangeRateService rates,
    IFlexClient flex,
    IDataProtectionProvider protection,
    IClock clock,
    ICurrentUser currentUser) : IBrokerImportService
{
    private const string TradeRefPrefix = "ibkr:t:";
    private const string CashRefPrefix = "ibkr:c:";
    private const string ActionRefPrefix = "ibkr:ca:";
    private const int MaxRefLength = 64;
    private const int MaxErrorLength = 500;
    private const int MaxDescriptionLength = 500;
    private const int MaxImportAttempts = 3;
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

    private IDataProtector Protector => protection.CreateProtector("JxFinance.BrokerConnection.Token");

    public async Task<Result<BrokerImportResponse>> ImportAsync(
        Guid accountId,
        Guid? fundingAccountId,
        Stream report,
        CancellationToken cancellationToken)
    {
        var parsed = await FlexParser.ParseAsync(report, cancellationToken);
        if (parsed.IsFailure)
        {
            return Result<BrokerImportResponse>.FailureFrom(parsed);
        }

        var statement = parsed.Value!;
        if (statement.BrokerAccounts.Count > 1)
        {
            return Result<BrokerImportResponse>.Failure(
                ErrorCodes.ImportInvalidFile,
                "The report covers several Interactive Brokers accounts. Create a Flex Query for one account.");
        }

        var account = new AccountId(accountId);
        AccountId? funding = fundingAccountId is { } id ? new AccountId(id) : null;
        if (await AccountErrorAsync(account, funding, cancellationToken) is { } accountError)
        {
            return Result<BrokerImportResponse>.Failure(ErrorCodes.ReferenceNotFound, accountError);
        }

        var currencies = statement.Trades.SelectMany(t => new[] { t.Instrument.Currency, t.CommissionCurrency })
            .Concat(statement.CashTransactions.Select(c => c.Currency))
            .Distinct()
            .ToArray();
        if (rates.UnusableReason(currencies) is { } currencyError)
        {
            return Result<BrokerImportResponse>.Failure(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var foreignDates = statement.Trades.Where(t => t.Instrument.Currency != rates.ReportingCurrency || t.CommissionCurrency != rates.ReportingCurrency)
            .Select(t => t.Date)
            .Concat(statement.CashTransactions.Where(c => c.Currency != rates.ReportingCurrency).Select(c => c.Date))
            .ToList();
        if (foreignDates.Count > 0)
        {
            await rates.EnsureRangeAsync(foreignDates.Min(), foreignDates.Max(), cancellationToken);
        }

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await ImportStatementAsync(statement, account, funding, cancellationToken);
            }
            catch (DbUpdateException ex) when (IsSecurityCollision(ex))
            {
                db.ChangeTracker.Clear();
                if (attempt >= MaxImportAttempts)
                {
                    return Result<BrokerImportResponse>.Failure(
                        ErrorCodes.ConflictBusy,
                        "A security in the report collides with an existing one. Try the import again.");
                }
            }
        }
    }

    private static bool IsSecurityCollision(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation, TableName: "Securities" };

    private async Task<Result<BrokerImportResponse>> ImportStatementAsync(
        FlexStatement statement,
        AccountId account,
        AccountId? funding,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var lockId = BitConverter.ToInt64(account.Value.ToByteArray(), 0);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({lockId})", cancellationToken);

        var entryRefs = (await db.InvestmentTransactions.IgnoreQueryFilters()
            .Where(t => t.AccountId == account && t.ExternalId != null)
            .Select(t => t.ExternalId!)
            .ToListAsync(cancellationToken)).ToHashSet();
        var conversionRefs = (await db.CurrencyConversions.IgnoreQueryFilters()
            .Where(c => c.AccountId == account && c.ImportRef != null)
            .Select(c => c.ImportRef!)
            .ToListAsync(cancellationToken)).ToHashSet();
        var transferRefs = (await db.TransferImports
            .Where(r => r.AccountId == account)
            .Select(r => r.ImportRef)
            .ToListAsync(cancellationToken)).ToHashSet();
        var securities = await db.Securities.ToListAsync(cancellationToken);

        var counts = new Counts { Skipped = statement.Unreadable };

        var renamedContracts = new Dictionary<long, Security>();
        var renamedIsins = new Dictionary<(string Isin, Currency Currency), Security>();

        Security? Find(FlexInstrument instrument)
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

        Security Resolve(FlexInstrument instrument)
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

        async Task<string?> AddEntryAsync(
            string reference,
            InvestmentTransactionType type,
            Security? security,
            DateOnly date,
            Money cash,
            string? description,
            decimal quantity = 0m,
            decimal price = 0m,
            decimal fee = 0m)
        {
            var reporting = await rates.ToReportingAsync(cash, date, cancellationToken);
            if (reporting.IsFailure)
            {
                return reporting.ErrorMessage;
            }

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
                ReportingAmount = reporting.Value,
                Description = description,
                Source = InvestmentSource.InteractiveBrokers,
                ExternalId = reference,
            });
            return null;
        }

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
            db.InvestmentTransactions.Add(new InvestmentTransaction
            {
                AccountId = account,
                SecurityId = security.Id,
                Type = InvestmentTransactionType.Split,
                Date = rows[0].Date,
                Quantity = ratio,
                CashAmount = new Money(0m, security.Currency),
                Description = description is { Length: > MaxDescriptionLength } ? description[..MaxDescriptionLength] : description,
                Source = InvestmentSource.InteractiveBrokers,
                ExternalId = reference,
            });
            counts.Splits++;
        }

        foreach (var trade in statement.Trades.OrderBy(t => t.Date))
        {
            var reference = TradeRefPrefix + trade.Id;
            string? error = null;
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
                    error = await AddConversionAsync(account, reference, trade, baseCurrency, cancellationToken);
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
                        $"Commission {trade.Instrument.Symbol}");
                }

                counts.Trades++;
            }

            if (error is not null)
            {
                return Result<BrokerImportResponse>.Failure(ErrorCodes.ExchangeRateUnavailable, error);
            }
        }

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
                else
                {
                    var amount = new Money(Math.Abs(entry.Amount), entry.Currency);
                    var transfer = new Transfer
                    {
                        FromAccountId = entry.Amount > 0 ? funding.Value : account,
                        ToAccountId = entry.Amount > 0 ? account : funding.Value,
                        Amount = amount,
                        ReceivedAmount = amount,
                        Date = entry.Date,
                        Description = entry.Description,
                    };
                    db.Transfers.Add(transfer);
                    db.TransferImports.Add(new TransferImport { AccountId = account, ImportRef = reference, TransferId = transfer.Id });
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
                    entry.Description);
                if (error is not null)
                {
                    return Result<BrokerImportResponse>.Failure(ErrorCodes.ExchangeRateUnavailable, error);
                }

                counts.CashEntries++;
            }
        }

        foreach (var position in statement.OpenPositions.Where(p => SecurityCategories.Contains(p.Instrument.AssetCategory)))
        {
            if (Find(position.Instrument) is { } security
                && (security.LastPriceDate is null || position.Date >= security.LastPriceDate)
                && (security.LastPrice != position.MarkPrice || security.LastPriceDate != position.Date))
            {
                security.LastPrice = position.MarkPrice;
                security.LastPriceDate = position.Date;
                counts.PricesUpdated++;
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        var mismatches = await ComparePositionsAsync(statement, account, Find, securities, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Result<BrokerImportResponse>.Success(new BrokerImportResponse(
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
            mismatches));
    }

    public async Task<IReadOnlyList<BrokerConnectionResponse>> GetConnectionsAsync(CancellationToken cancellationToken)
    {
        var connections = await db.BrokerConnections.OrderBy(c => c.CreatedAt).ToListAsync(cancellationToken);
        return connections.Select(ToResponse).ToList();
    }

    public async Task<Result<BrokerConnectionResponse>> SaveConnectionAsync(
        SaveBrokerConnectionRequest request,
        CancellationToken cancellationToken)
    {
        var account = new AccountId(request.AccountId);
        AccountId? funding = request.FundingAccountId is { } id ? new AccountId(id) : null;
        if (await AccountErrorAsync(account, funding, cancellationToken) is { } accountError)
        {
            return Result<BrokerConnectionResponse>.Failure(ErrorCodes.ReferenceNotFound, accountError);
        }

        if (!await db.Accounts.AnyAsync(a => a.Id == account && a.UserId == currentUser.Id, cancellationToken))
        {
            return Result<BrokerConnectionResponse>.Failure(ErrorCodes.AccessForbidden, "Only the account's owner can connect it to a broker.");
        }

        var connection = await db.BrokerConnections.FirstOrDefaultAsync(c => c.AccountId == account, cancellationToken);
        if (connection is null)
        {
            if (string.IsNullOrEmpty(request.Token))
            {
                return Result<BrokerConnectionResponse>.Failure(ErrorCodes.BrokerTokenRequired, "Enter the Flex Web Service token.");
            }

            connection = new BrokerConnection { AccountId = account };
            db.BrokerConnections.Add(connection);
        }

        connection.QueryId = request.QueryId;
        connection.FundingAccountId = funding;
        connection.IsEnabled = request.IsEnabled;
        if (!string.IsNullOrEmpty(request.Token))
        {
            connection.ProtectedToken = Protector.Protect(request.Token);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<BrokerConnectionResponse>.Success(ToResponse(connection));
    }

    public async Task<Result<Guid>> DeleteConnectionAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var account = new AccountId(accountId);
        var connection = await db.BrokerConnections.FirstOrDefaultAsync(c => c.AccountId == account, cancellationToken);
        if (connection is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Connection not found.");
        }

        connection.ProtectedToken = string.Empty;
        db.BrokerConnections.Remove(connection);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(accountId);
    }

    public async Task<Result<BrokerImportResponse>> SyncAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var account = new AccountId(accountId);
        var connection = await db.BrokerConnections.FirstOrDefaultAsync(c => c.AccountId == account, cancellationToken);
        if (connection is null)
        {
            return Result<BrokerImportResponse>.Failure(ErrorCodes.ResourceNotFound, "Connection not found.");
        }

        Result<BrokerImportResponse> result;
        try
        {
            result = await DownloadAndImportAsync(connection, cancellationToken);
        }
        catch (Exception ex) when (ex is DbUpdateException or InvalidOperationException)
        {
            result = Result<BrokerImportResponse>.Failure(ErrorCodes.BrokerUnavailable, "The report could not be imported.");
        }

        db.ChangeTracker.Clear();
        db.Attach(connection);
        connection.LastSyncAt = clock.UtcNow;
        connection.LastError = result.ErrorMessage is { Length: > MaxErrorLength } message ? message[..MaxErrorLength] : result.ErrorMessage;
        await db.SaveChangesAsync(cancellationToken);

        return result;
    }

    private async Task<IReadOnlyList<PositionMismatchResponse>?> ComparePositionsAsync(
        FlexStatement statement,
        AccountId account,
        Func<FlexInstrument, Security?> find,
        List<Security> securities,
        CancellationToken cancellationToken)
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
            var security = find(position.Instrument);
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

    private async Task<Result<BrokerImportResponse>> DownloadAndImportAsync(
        BrokerConnection connection,
        CancellationToken cancellationToken)
    {
        string token;
        try
        {
            token = Protector.Unprotect(connection.ProtectedToken);
        }
        catch (CryptographicException)
        {
            return Result<BrokerImportResponse>.Failure(ErrorCodes.BrokerTokenRequired, "The stored token can no longer be read. Enter it again.");
        }

        var report = await flex.DownloadAsync(token, connection.QueryId, cancellationToken);
        if (report.IsFailure)
        {
            return Result<BrokerImportResponse>.FailureFrom(report);
        }

        await using var stream = report.Value!;
        return await ImportAsync(connection.AccountId.Value, connection.FundingAccountId?.Value, stream, cancellationToken);
    }

    private async Task<string?> AddConversionAsync(
        AccountId account,
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
                return reporting.ErrorMessage;
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

    private async Task<string?> AccountErrorAsync(AccountId account, AccountId? funding, CancellationToken cancellationToken)
    {
        var wanted = funding is null ? new[] { account } : [account, funding.Value];
        return funding != account && await db.Accounts.CountAsync(a => wanted.Contains(a.Id), cancellationToken) == wanted.Length
            ? null
            : "Choose accounts you can access, and a different funding account.";
    }

    private static BrokerConnectionResponse ToResponse(BrokerConnection connection) => new(
        connection.AccountId.Value,
        connection.FundingAccountId?.Value,
        connection.QueryId,
        connection.IsEnabled,
        connection.LastSyncAt,
        connection.LastError);

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
