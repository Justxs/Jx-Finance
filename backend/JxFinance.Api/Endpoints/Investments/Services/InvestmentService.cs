using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
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
public sealed class InvestmentService(AppDbContext db, InvestmentMapper mapper, IExchangeRateService rates, IClock clock)
    : IInvestmentService
{
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

        foreach (var account in transactions.Where(t => t.SecurityId is not null).GroupBy(t => t.AccountId))
        {
            var dividends = account
                .Where(t => t.Type == InvestmentTransactionType.Dividend)
                .GroupBy(t => t.SecurityId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(t => t.CashAmount.Amount));

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
                var costReporting = latest.Convert(position.CostBasis, security.Currency, reporting);
                isComplete &= !position.IsOversold;
                if (position.Quantity != 0m)
                {
                    isComplete &= valueReporting is not null && costReporting is not null;
                    marketValue += valueReporting ?? 0m;
                    costBasis += valueReporting is null ? 0m : costReporting ?? 0m;
                }

                holdings.Add(mapper.ToHolding(account.Key, security, position, value, valueReporting, realized, received));
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

        return page.Map(t => mapper.FromEntity(t, t.SecurityId is { } id ? symbols.GetValueOrDefault(id) : null));
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

        return mapper.FromEntity(transaction, security?.Symbol);
    }

    public async Task<Result<InvestmentTransactionResponse>> UpdateTransactionAsync(
        UpdateInvestmentTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var transactionId = new InvestmentTransactionId(request.Id);
        var transaction = await db.InvestmentTransactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Investment transaction not found.");
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

        return mapper.FromEntity(transaction, security?.Symbol);
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

        var transaction = mapper.ToEntity(request, currency);
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
        var transaction = await db.InvestmentTransactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Investment transaction not found.");
        }

        if (transaction.SecurityId is { } securityId
            && transaction.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Split
            && await IsOversoldAsync(transaction.AccountId, securityId, history => history.Where(t => t.Id != transactionId), cancellationToken))
        {
            return new DomainError(
                ErrorCodes.HoldingDependentSales,
                "Later sales depend on this entry. Delete those first.");
        }

        db.InvestmentTransactions.Remove(transaction);
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
        return securities.Select(mapper.FromEntity).ToList();
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
        mapper.Apply(request, symbol, security);
        await RecordPriceAsync(request, security, cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Duplicate(symbol, request.Currency);
        }

        return mapper.FromEntity(security);
    }

    public async Task<Result<SecurityResponse>> UpdateSecurityAsync(SaveSecurityRequest request, CancellationToken cancellationToken)
    {
        var id = new SecurityId(request.Id);
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        var security = await db.Securities.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (security is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Security not found.");
        }

        if (await db.Securities.AnyAsync(s => s.Id != id && s.Symbol == symbol && s.Currency == request.Currency, cancellationToken))
        {
            return Duplicate(symbol, request.Currency);
        }

        if (security.Currency != request.Currency
            && await db.InvestmentTransactions.IgnoreQueryFilters().AnyAsync(t => t.SecurityId == id && !t.IsDeleted, cancellationToken))
        {
            return new DomainError(
                ErrorCodes.ValueLocked,
                "The currency cannot change once the security has transactions.");
        }

        mapper.Apply(request, symbol, security);
        await RecordPriceAsync(request, security, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return mapper.FromEntity(security);
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
        CancellationToken cancellationToken)
    {
        var history = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => t.AccountId == accountId && t.SecurityId == securityId)
            .ToListAsync(cancellationToken);
        if (Portfolio.Positions(history).GetValueOrDefault(securityId)?.IsOversold == true)
        {
            return false;
        }

        return Portfolio.Positions(change(history)).GetValueOrDefault(securityId)?.IsOversold == true;
    }

    private sealed class YearTotals
    {
        public decimal Dividends { get; set; }
        public decimal WithholdingTax { get; set; }
        public decimal Interest { get; set; }
        public decimal Fees { get; set; }
        public decimal RealizedGain { get; set; }
    }
}
