using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Holdings;
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
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<IInvestmentService>(LifeTime.Scoped)]
public sealed class InvestmentService(
    AppDbContext db,
    IExchangeRateService rates,
    IClock clock,
    IHoldingLedger ledger,
    IDeletionRecorder deletions) : IInvestmentService
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
                y.Value.RealizedGain)).ToList());
    }

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
            query = query.Where(t => t.SecurityId == typedSecurityId);
        }

        if (request.Type is { } type)
        {
            query = query.Where(t => t.Type == type);
        }

        var page = await query.ToPageAsync(
            request,
            sorted => sorted.OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAt),
            cancellationToken);

        var securityIds = page.Items.Where(t => t.SecurityId is not null).Select(t => t.SecurityId!.Value).Distinct().ToList();
        var symbols = await db.Securities
            .Where(s => securityIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Symbol, cancellationToken);

        return page.Map(t => t.ToResponse(t.SecurityId is { } id ? symbols.GetValueOrDefault(id) : null));
    }

    public async Task<Result<InvestmentTransactionResponse>> CreateTransactionAsync(
        CreateInvestmentTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var built = await BuildTransactionAsync(request, cancellationToken);
        if (built.IsFailure)
        {
            return built.Error;
        }

        var (transaction, security) = built.Value;
        if (transaction.SecurityId is { } tradedId
            && await IsOversoldAsync(transaction.AccountId, tradedId, history => history.Append(transaction), cancellationToken))
        {
            return new DomainError(ErrorCodes.HoldingOversold, OversoldMessage);
        }

        db.InvestmentTransactions.Add(transaction);
        await db.SaveChangesAsync(cancellationToken);

        return transaction.ToResponse(security?.Symbol);
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
            return new DomainError(
                ErrorCodes.ResourceReadOnly,
                "This entry was imported from a broker. Correct it there and import again.");
        }

        var built = await BuildTransactionAsync(request, cancellationToken);
        if (built.IsFailure)
        {
            return built.Error;
        }

        var (corrected, security) = built.Value;
        corrected.Id = transactionId;

        var movedAway = transaction.SecurityId is { } previousId
            && (previousId != corrected.SecurityId || transaction.AccountId != corrected.AccountId);
        if (movedAway
            && await IsOversoldAsync(
                transaction.AccountId,
                transaction.SecurityId!.Value,
                history => history.Where(t => t.Id != transactionId),
                cancellationToken))
        {
            return new DomainError(
                ErrorCodes.HoldingDependentSales,
                "Later sales depend on this entry. Correct those first.");
        }

        if (corrected.SecurityId is { } correctedId
            && await IsOversoldAsync(
                corrected.AccountId,
                correctedId,
                history => history.Where(t => t.Id != transactionId).Append(corrected),
                cancellationToken))
        {
            return new DomainError(ErrorCodes.HoldingOversold, OversoldMessage);
        }

        transaction.AccountId = corrected.AccountId;
        transaction.SecurityId = corrected.SecurityId;
        transaction.Type = corrected.Type;
        transaction.Date = corrected.Date;
        transaction.Quantity = corrected.Quantity;
        transaction.Price = corrected.Price;
        transaction.Fee = corrected.Fee;
        transaction.CashAmount = corrected.CashAmount;
        transaction.ReportingAmount = corrected.ReportingAmount;
        transaction.Description = corrected.Description;
        await db.SaveChangesAsync(cancellationToken);

        return transaction.ToResponse(security?.Symbol);
    }

    private async Task<Result<(InvestmentTransaction Transaction, Security? Security)>> BuildTransactionAsync(
        IInvestmentTransactionInput request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.AccountId);
        var accountCurrency = await db.Accounts
            .Where(a => a.Id == accountId)
            .Select(a => (Currency?)a.StartingBalance.Currency)
            .FirstOrDefaultAsync(cancellationToken);
        if (accountCurrency is null)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Account does not exist.");
        }

        Security? security = null;
        if (request.SecurityId is { } securityId)
        {
            var typedSecurityId = new SecurityId(securityId);
            security = await db.Securities.FirstOrDefaultAsync(s => s.Id == typedSecurityId, cancellationToken);
            if (security is null)
            {
                return new DomainError(ErrorCodes.ReferenceNotFound, "Security does not exist.");
            }
        }

        var isTrade = request.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell;
        var currency = (isTrade ? null : request.Currency) ?? security?.Currency ?? request.Currency ?? accountCurrency.Value;
        if (rates.UnusableReason(currency) is { } currencyError)
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
        return (transaction, security);
    }

    public async Task<Result<Guid>> DeleteTransactionAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new InvestmentTransactionId(id);
        if (await db.InvestmentTransactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken) is not { } transaction)
        {
            return TransactionNotFound;
        }

        if (transaction.SecurityId is { } securityId
            && transaction.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Split
            && await IsOversoldAsync(transaction.AccountId, securityId, history => history.Where(t => t.Id != transactionId), cancellationToken))
        {
            return new DomainError(
                ErrorCodes.HoldingDependentSales,
                "Later sales depend on this entry. Delete those first.");
        }

        var symbol = transaction.SecurityId is { } heldId
            ? await db.Securities.Where(s => s.Id == heldId).Select(s => s.Symbol).FirstOrDefaultAsync(cancellationToken)
            : null;
        db.InvestmentTransactions.Remove(transaction);
        deletions.Record(TrashKind.InvestmentTransaction, id, TrashLabel.Investment(transaction, symbol));
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

    public async Task<Result<SecurityResponse>> CreateSecurityAsync(SaveSecurityRequest request, CancellationToken cancellationToken)
    {
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        if (await db.Securities.AnyAsync(s => s.Symbol == symbol && s.Currency == request.Currency, cancellationToken))
        {
            return Duplicate(symbol, request.Currency);
        }

        var security = new Security();
        db.Securities.Add(security);
        request.ApplyTo(symbol, security);
        await RecordPriceAsync(request, security, cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Duplicate(symbol, request.Currency);
        }

        return security.ToResponse();
    }

    public async Task<Result<SecurityResponse>> UpdateSecurityAsync(SaveSecurityRequest request, CancellationToken cancellationToken)
    {
        var id = new SecurityId(request.Id);
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        var found = await db.Securities.FindOrNotFoundAsync(s => s.Id == id, "Security not found.", cancellationToken);
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
                .AnyAsync(t => t.SecurityId == id, cancellationToken))
        {
            return new DomainError(
                ErrorCodes.ValueLocked,
                "The currency cannot change once the security has transactions.");
        }

        request.ApplyTo(symbol, security);
        await RecordPriceAsync(request, security, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return security.ToResponse();
    }

    private Task RecordPriceAsync(SaveSecurityRequest request, Security security, CancellationToken cancellationToken) =>
        request.LastPrice is { } price
            ? SecurityPriceBook.RecordAsync(db, security, request.LastPriceDate ?? clock.Today, price, cancellationToken)
            : Task.CompletedTask;

    private static Result<SecurityResponse> Duplicate(string symbol, Currency currency) =>
        new DomainError(ErrorCodes.ConflictDuplicate, $"{symbol} in {currency.ToCode()} already exists.");

    private async Task<bool> IsOversoldAsync(
        AccountId accountId,
        SecurityId securityId,
        Func<IEnumerable<InvestmentTransaction>, IEnumerable<InvestmentTransaction>> change,
        CancellationToken cancellationToken) =>
        await ledger.FirstOversoldSaleAsync(accountId, securityId, change, cancellationToken) is not null;

    private sealed class YearTotals
    {
        public decimal Dividends { get; set; }
        public decimal WithholdingTax { get; set; }
        public decimal Interest { get; set; }
        public decimal Fees { get; set; }
        public decimal RealizedGain { get; set; }
    }
}
