using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Holdings;
using JxFinance.Common.References;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Investments.CreateInvestmentTransaction;
using JxFinance.Endpoints.Investments.GetInvestmentTransactions;
using JxFinance.Endpoints.Investments.GetPortfolio;
using JxFinance.Endpoints.Investments.GetSecurities;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Mappers;
using JxFinance.Endpoints.Investments.SaveSecurity;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Endpoints.Investments.UpdateInvestmentTransaction;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.MarketPrices;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<IInvestmentService>(LifeTime.Scoped)]
public sealed class InvestmentService(
    AppDbContext db,
    IExchangeRateService rates,
    IClock clock,
    IHoldingLedger ledger,
    IDeletionRecorder deletions,
    IReferenceGuard references) : IInvestmentService
{
    private static readonly DomainError TransactionNotFound = EntityLookup.NotFound("Investment transaction not found.");

    private const string OversoldMessage =
        "This would sell more than was held on that date; short positions are not supported.";

    public async Task<PortfolioResponse> GetPortfolioAsync(GetPortfolioRequest request, CancellationToken cancellationToken)
    {
        var query = db.InvestmentTransactions.AsQueryable();
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(t => t.AccountId == typedAccountId);
        }

        var transactions = await query.AsNoTracking().ToListAsync(cancellationToken);
        var securities = await db.Securities.AsNoTracking().ToDictionaryAsync(s => s.Id, cancellationToken);
        var latest = await rates.GetLatestAsync(cancellationToken);
        var reporting = rates.ReportingCurrency;

        var holdings = new List<HoldingResponse>();
        var years = new SortedDictionary<int, YearTotals>(Comparer<int>.Create((a, b) => b.CompareTo(a)));
        var (marketValue, costBasis) = (0m, 0m);
        var isComplete = true;

        YearTotals Year(DateOnly date) => years.TryGetValue(date.Year, out var totals) ? totals : years[date.Year] = new YearTotals();

        foreach (var transaction in transactions.Where(t => t.Type != InvestmentTransactionType.Split))
        {
            var totals = Year(transaction.Date);
            switch (transaction.Type)
            {
                case InvestmentTransactionType.Dividend:
                    totals.Dividends += transaction.ReportingAmount;
                    break;
                case InvestmentTransactionType.WithholdingTax:
                    totals.WithholdingTax -= transaction.ReportingAmount;
                    break;
                case InvestmentTransactionType.Interest:
                    totals.Interest += transaction.ReportingAmount;
                    break;
                case InvestmentTransactionType.Fee:
                    totals.Fees -= transaction.ReportingAmount;
                    break;
                default:
                    break;
            }
        }

        var foreignDividends = transactions
            .Where(t => t is { Type: InvestmentTransactionType.Dividend, SecurityId: { } id }
                && t.CashAmount.Currency != securities[id].Currency)
            .ToList();
        var dividendRates = foreignDividends.Count == 0
            ? null
            : await rates.GetHistoryAsync(foreignDividends.Min(t => t.Date), foreignDividends.Max(t => t.Date), cancellationToken);

        decimal? InSecurityCurrency(InvestmentTransaction dividend)
        {
            var currency = securities[dividend.SecurityId!.Value].Currency;
            return dividend.CashAmount.Currency == currency
                ? dividend.CashAmount.Amount
                : dividendRates!.OnOrBefore(dividend.Date).Convert(dividend.CashAmount.Amount, dividend.CashAmount.Currency, currency);
        }

        foreach (var account in transactions.Where(t => t.SecurityId is not null).GroupBy(t => t.AccountId))
        {
            var dividends = new Dictionary<SecurityId, decimal>();
            foreach (var dividend in account.Where(t => t.Type == InvestmentTransactionType.Dividend))
            {
                var amount = InSecurityCurrency(dividend);
                isComplete &= amount is not null;
                dividends[dividend.SecurityId!.Value] = dividends.GetValueOrDefault(dividend.SecurityId!.Value) + (amount ?? 0m);
            }

            foreach (var position in Portfolio.Positions(account).Values)
            {
                foreach (var sale in position.Sales)
                {
                    Year(sale.Date).RealizedGain += sale.ReportingGain;
                }

                var realized = position.Sales.Sum(s => s.Gain);
                var received = dividends.GetValueOrDefault(position.SecurityId);
                if (position.Quantity == 0m && realized == 0m && received == 0m)
                {
                    continue;
                }

                var security = securities[position.SecurityId];
                var (value, valueReporting, _) = position.Value(security.LastPrice, security.Currency, latest, reporting);
                isComplete &= !position.IsOversold;
                if (position.Quantity != 0m)
                {
                    isComplete &= valueReporting is not null;
                    marketValue += valueReporting ?? 0m;
                    costBasis += valueReporting is null ? 0m : Money.Round(position.ReportingCostBasis);
                }

                holdings.Add(position.ToHoldingResponse(account.Key, security, value, valueReporting, realized, received));
            }
        }

        var open = holdings.Where(h => h.Quantity != 0m && h.MarketValueReporting is not null).ToList();
        List<(DateOnly Date, decimal Amount)> flows =
        [
            .. transactions.Where(t => t.Type != InvestmentTransactionType.Split).Select(t => (t.Date, t.ReportingAmount)),
            (clock.Today, marketValue),
        ];

        return new PortfolioResponse(
            reporting,
            marketValue,
            costBasis,
            marketValue - costBasis,
            years.Values.Sum(y => y.RealizedGain),
            years.Values.Sum(y => y.Dividends),
            years.Values.Sum(y => y.WithholdingTax),
            years.Values.Sum(y => y.Fees),
            isComplete,
            holdings
                .OrderByDescending(h => h.MarketValueReporting ?? 0m)
                .ThenBy(h => h.Security.Symbol, StringComparer.Ordinal)
                .ToList(),
            years.Select(y => new PortfolioYear(
                y.Key,
                y.Value.Dividends,
                y.Value.WithholdingTax,
                y.Value.Interest,
                y.Value.Fees,
                y.Value.RealizedGain)).ToList())
        {
            AnnualizedReturn = isComplete ? MoneyWeightedReturn.Annualized(flows) : null,
            ByType = Slices(open, h => AllocationBucket.Of(h.Security.Type)),
            ByCurrency = Slices(open, h => AllocationBucket.Of(h.Security.Currency)),
        };
    }

    private static List<PortfolioSlice> Slices(IEnumerable<HoldingResponse> holdings, Func<HoldingResponse, string> key) =>
        holdings
            .GroupBy(key)
            .Select(group => new PortfolioSlice(group.Key, group.Sum(h => h.MarketValueReporting ?? 0m)))
            .OrderByDescending(slice => slice.MarketValue)
            .ToList();

    public async Task<PagedResponse<InvestmentTransactionResponse>> GetTransactionsAsync(
        GetInvestmentTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var query = db.InvestmentTransactions.AsQueryable();
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(t => t.AccountId == typedAccountId);
        }

        if (request.SecurityId is { } securityId)
        {
            var typedSecurityId = new SecurityId(securityId);
            query = query.Where(t => t.SecurityId == typedSecurityId || t.RelatedSecurityId == typedSecurityId);
        }

        if (request.Type is { } type)
        {
            query = query.Where(t => t.Type == type);
        }

        var page = await query.ToPageAsync(
            request,
            sorted => sorted.OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAt),
            cancellationToken);

        var securityIds = page.Items.SelectMany(Portfolio.SecuritiesOf).Distinct().ToList();
        var symbols = await db.Securities
            .Where(s => securityIds.Contains(s.Id))
            .Select(s => new { Key = s.Id, Value = s.Symbol })
            .ToDictionaryAsync(x => x.Key, x => x.Value, cancellationToken);

        return page.Map(t => t.ToResponse(
            t.SecurityId is { } id ? symbols.GetValueOrDefault(id) : null,
            t.RelatedSecurityId is { } relatedId ? symbols.GetValueOrDefault(relatedId) : null));
    }

    public async Task<Result<InvestmentTransactionResponse>> CreateTransactionAsync(
        CreateInvestmentTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var built = await BuildTransactionAsync(request, null, cancellationToken);
        if (built.IsFailure)
        {
            return built.Error;
        }

        var (transaction, security, related) = built.Value;
        if (transaction.SecurityId is not null
            && await IsOversoldAsync(transaction.AccountId, history => history.Append(transaction), cancellationToken))
        {
            return new DomainError(ErrorCodes.HoldingOversold, OversoldMessage);
        }

        db.InvestmentTransactions.Add(transaction);
        await db.SaveChangesAsync(cancellationToken);

        return transaction.ToResponse(security?.Symbol, related?.Symbol);
    }

    public async Task<Result<InvestmentTransactionResponse>> UpdateTransactionAsync(
        UpdateInvestmentTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var transactionId = new InvestmentTransactionId(request.Id);
        if (await db.InvestmentTransactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken) is not { } transaction)
        {
            return TransactionNotFound;
        }

        if (transaction.Source != InvestmentSource.Manual)
        {
            return Portfolio.TakesCostShare(transaction)
                ? await SetCostShareAsync(transaction, request.CostShare, cancellationToken)
                : new DomainError(
                    ErrorCodes.ResourceReadOnly,
                    "This entry was imported from a broker. Correct it there and import again.");
        }

        var built = await BuildTransactionAsync(request, transaction.CashAmount.Currency, cancellationToken);
        if (built.IsFailure)
        {
            return built.Error;
        }

        var (corrected, security, related) = built.Value;
        corrected.Id = transactionId;

        var movedAway = transaction.AccountId != corrected.AccountId
            || Portfolio.SecuritiesOf(transaction).Except(Portfolio.SecuritiesOf(corrected)).Any();
        if (movedAway
            && await IsOversoldAsync(
                transaction.AccountId,
                history => history.Where(t => t.Id != transactionId),
                cancellationToken))
        {
            return new DomainError(
                ErrorCodes.HoldingDependentSales,
                "Later sales depend on this entry. Correct those first.");
        }

        if (corrected.SecurityId is not null
            && await IsOversoldAsync(
                corrected.AccountId,
                history => history.Where(t => t.Id != transactionId).Append(corrected),
                cancellationToken))
        {
            return new DomainError(ErrorCodes.HoldingOversold, OversoldMessage);
        }

        transaction.AccountId = corrected.AccountId;
        transaction.SecurityId = corrected.SecurityId;
        transaction.RelatedSecurityId = corrected.RelatedSecurityId;
        transaction.Type = corrected.Type;
        transaction.Date = corrected.Date;
        transaction.Quantity = corrected.Quantity;
        transaction.RelatedQuantity = corrected.RelatedQuantity;
        transaction.CostShare = corrected.CostShare;
        transaction.Price = corrected.Price;
        transaction.Fee = corrected.Fee;
        transaction.CashAmount = corrected.CashAmount;
        transaction.ReportingAmount = corrected.ReportingAmount;
        transaction.Description = corrected.Description;
        await db.SaveChangesAsync(cancellationToken);

        return transaction.ToResponse(security?.Symbol, related?.Symbol);
    }

    private async Task<Result<InvestmentTransactionResponse>> SetCostShareAsync(
        InvestmentTransaction transaction,
        decimal? costShare,
        CancellationToken cancellationToken)
    {
        transaction.CostShare = costShare;
        await db.SaveChangesAsync(cancellationToken);

        var (symbol, relatedSymbol) = await SymbolsAsync(transaction, cancellationToken);
        return transaction.ToResponse(symbol, relatedSymbol);
    }

    private async Task<(string? Symbol, string? RelatedSymbol)> SymbolsAsync(
        InvestmentTransaction transaction,
        CancellationToken cancellationToken)
    {
        var securityIds = Portfolio.SecuritiesOf(transaction).ToList();
        var symbols = await db.Securities
            .Where(s => securityIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Symbol, cancellationToken);
        return (
            transaction.SecurityId is { } id ? symbols.GetValueOrDefault(id) : null,
            transaction.RelatedSecurityId is { } relatedId ? symbols.GetValueOrDefault(relatedId) : null);
    }

    private async Task<Result<(InvestmentTransaction Transaction, Security? Security, Security? Related)>> BuildTransactionAsync(
        IInvestmentTransactionInput request,
        Currency? keptCurrency,
        CancellationToken cancellationToken)
    {
        var accountFound = await references.AccountCurrencyAsync(new AccountId(request.AccountId), cancellationToken);
        if (!accountFound.TryGetValue(out var accountCurrency))
        {
            return accountFound.Error;
        }

        var security = await SecurityAsync(request.SecurityId, cancellationToken);
        var related = await SecurityAsync(request.RelatedSecurityId, cancellationToken);
        if ((request.SecurityId is not null && security is null) || (request.RelatedSecurityId is not null && related is null))
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Security does not exist.");
        }

        if (related is not null && related.Currency != security?.Currency)
        {
            return new DomainError(
                ErrorCodes.HoldingCurrencyDiffers,
                "Both securities must trade in the same currency, because the cost basis moves from one to the other.");
        }

        var inSecurityCurrency = request.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell
            || Portfolio.CorporateActionTypes.Contains(request.Type);
        var currency = (inSecurityCurrency ? null : request.Currency) ?? security?.Currency ?? request.Currency ?? accountCurrency;
        if (currency != keptCurrency && rates.UnusableReason(currency) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var transaction = request.ToEntity(currency);
        var reportingAmount = await rates.ToReportingAsync(transaction.CashAmount, transaction.Date, cancellationToken);
        if (reportingAmount.IsFailure)
        {
            return reportingAmount.Error;
        }

        transaction.ReportingAmount = reportingAmount.Value;
        return (transaction, security, related);
    }

    private async Task<Security?> SecurityAsync(Guid? id, CancellationToken cancellationToken)
    {
        if (id is not { } value)
        {
            return null;
        }

        var securityId = new SecurityId(value);
        return await db.Securities.FirstOrDefaultAsync(s => s.Id == securityId, cancellationToken);
    }

    public async Task<Result<Guid>> DeleteTransactionAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new InvestmentTransactionId(id);
        if (await db.InvestmentTransactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken) is not { } transaction)
        {
            return TransactionNotFound;
        }

        if (transaction.SecurityId is not null
            && transaction.Type != InvestmentTransactionType.Sell
            && Portfolio.PositionTypes.Contains(transaction.Type)
            && await IsOversoldAsync(transaction.AccountId, history => history.Where(t => t.Id != transactionId), cancellationToken))
        {
            return new DomainError(
                ErrorCodes.HoldingDependentSales,
                "Later sales depend on this entry. Delete those first.");
        }

        var (symbol, relatedSymbol) = await SymbolsAsync(transaction, cancellationToken);
        db.InvestmentTransactions.Remove(transaction);
        deletions.Record(TrashKind.InvestmentTransaction, id, TrashLabel.Investment(transaction, symbol, relatedSymbol));
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    public async Task<IReadOnlyList<SecurityResponse>> GetSecuritiesAsync(
        GetSecuritiesRequest request,
        CancellationToken cancellationToken)
    {
        var query = db.Securities.AsQueryable();
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var pattern = LikePattern.Contains(request.Search);
            query = query.Where(s =>
                EF.Functions.ILike(s.Symbol, pattern, LikePattern.Escape)
                || EF.Functions.ILike(s.Name, pattern, LikePattern.Escape)
                || (s.Isin != null && EF.Functions.ILike(s.Isin, pattern, LikePattern.Escape)));
        }

        var securities = await query.OrderBy(s => s.Symbol).ThenBy(s => s.Currency).ToListAsync(cancellationToken);
        return securities.Select(s => s.ToResponse()).ToList();
    }

    public async Task<Result<SecurityResponse>> CreateSecurityAsync(
        SaveSecurityRequest request,
        bool isAdministrator,
        CancellationToken cancellationToken)
    {
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        if (request.PriceSource != PriceSource.None && !isAdministrator)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only an administrator can choose where the prices of a security come from.");
        }

        if (await db.Securities.AnyAsync(s => s.Symbol == symbol && s.Currency == request.Currency, cancellationToken))
        {
            return Duplicate(symbol, request.Currency);
        }

        if (await MappingErrorAsync(request, null, cancellationToken) is { } mappingError)
        {
            return mappingError;
        }

        var security = new Security();
        db.Securities.Add(security);
        request.ApplyTo(symbol, security);
        await RecordPriceAsync(request, security, cancellationToken);
        if (await db.SaveOrConflictAsync(Duplicate(symbol, request.Currency), cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return security.ToResponse();
    }

    public async Task<Result<SecurityResponse>> UpdateSecurityAsync(SaveSecurityRequest request, CancellationToken cancellationToken)
    {
        var id = new SecurityId(request.Id);
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        var found = await db.Securities.FindOrNotFoundAsync(s => s.Id == id, EntityLookup.NotFound("Security not found."), cancellationToken);
        if (!found.TryGetValue(out var security))
        {
            return found.Error;
        }

        if (await db.Securities.AnyAsync(s => s.Id != id && s.Symbol == symbol && s.Currency == request.Currency, cancellationToken))
        {
            return Duplicate(symbol, request.Currency);
        }

        if (security.Currency != request.Currency
            && await db.InvestmentTransactions
                .IgnoreQueryFilters(QueryFilters.OwnerOnly)
                .AnyAsync(t => t.SecurityId == id || t.RelatedSecurityId == id, cancellationToken))
        {
            return new DomainError(
                ErrorCodes.ValueLocked,
                "The currency cannot change once the security has transactions.");
        }

        if (await MappingErrorAsync(request, security, cancellationToken) is { } mappingError)
        {
            return mappingError;
        }

        request.ApplyTo(symbol, security);
        await RecordPriceAsync(request, security, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return security.ToResponse();
    }

    private Task RecordPriceAsync(SaveSecurityRequest request, Security security, CancellationToken cancellationToken) =>
        request.LastPrice is { } price
            ? SecurityPriceBook.RecordAsync(db, security, request.LastPriceDate ?? clock.Today, price, PriceSourceKind.Manual, cancellationToken)
            : Task.CompletedTask;

    private async Task<DomainError?> MappingErrorAsync(
        SaveSecurityRequest request,
        Security? security,
        CancellationToken cancellationToken)
    {
        var changed = security is null
            || security.PriceSource != request.PriceSource
            || !string.Equals(security.PriceSymbol, request.PriceSymbol?.Trim(), StringComparison.OrdinalIgnoreCase);
        if (request.PriceSource != PriceSource.Eodhd || !changed)
        {
            return null;
        }

        return await db.InstanceSettings.AnyAsync(s => s.EodhdProtectedKey != "", cancellationToken)
            ? null
            : MarketPriceErrors.KeyRequired;
    }

    private static DomainError Duplicate(string symbol, Currency currency) =>
        new DomainError(ErrorCodes.ConflictDuplicate, $"{symbol} in {currency.ToCode()} already exists.");

    private async Task<bool> IsOversoldAsync(
        AccountId accountId,
        Func<IEnumerable<InvestmentTransaction>, IEnumerable<InvestmentTransaction>> change,
        CancellationToken cancellationToken) =>
        (await ledger.NewlyOversoldAsync(accountId, change, cancellationToken)).Count > 0;

    private sealed class YearTotals
    {
        public decimal Dividends { get; set; }
        public decimal WithholdingTax { get; set; }
        public decimal Interest { get; set; }
        public decimal Fees { get; set; }
        public decimal RealizedGain { get; set; }
    }
}
