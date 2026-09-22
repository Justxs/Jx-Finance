using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Investments.DeleteSecurityPrice;
using JxFinance.Endpoints.Investments.GetSecurityPrices;
using JxFinance.Endpoints.Investments.GetValueHistory;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Mappers;
using JxFinance.Endpoints.Investments.SetSecurityPrice;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<ISecurityPriceService>(LifeTime.Scoped)]
public sealed class SecurityPriceService(AppDbContext db, IExchangeRateService rates, IClock clock)
    : ISecurityPriceService
{
    private const int DailyUpToDays = 92;
    private const int WeeklyUpToDays = 731;
    private const string NotHeldMessage =
        "Only someone who holds this security, or an administrator, can change its prices.";

    private static readonly InvestmentTransactionType[] ReplayedTypes =
    [
        InvestmentTransactionType.Buy,
        InvestmentTransactionType.Sell,
        InvestmentTransactionType.Split,
    ];

    public async Task<Result<SecurityResponse>> SetPriceAsync(
        SetSecurityPriceRequest request,
        bool isAdministrator,
        CancellationToken cancellationToken)
    {
        var writable = await FindWritableAsync(new SecurityId(request.Id), isAdministrator, cancellationToken);
        if (writable.IsFailure)
        {
            return writable.Error;
        }

        var security = writable.Value!;
        await SecurityPriceBook.RecordAsync(
            db,
            security,
            request.LastPriceDate ?? clock.Today,
            request.LastPrice!.Value,
            cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return new DomainError(ErrorCodes.ConflictBusy, "Someone else recorded a price for that date just now. Try again.");
        }

        return security.ToResponse();
    }

    public async Task<Result<IReadOnlyList<SecurityPriceResponse>>> GetPricesAsync(
        GetSecurityPricesRequest request,
        CancellationToken cancellationToken)
    {
        var id = new SecurityId(request.Id);
        if (!await db.Securities.AnyAsync(s => s.Id == id, cancellationToken))
        {
            return EntityLookup.NotFound("Security not found.");
        }

        var query = db.SecurityPrices.AsNoTracking().Where(p => p.SecurityId == id);
        if (request.From is { } from)
        {
            query = query.Where(p => p.Date >= from);
        }

        if (request.To is { } to)
        {
            query = query.Where(p => p.Date <= to);
        }

        var points = await query.OrderByDescending(p => p.Date).ToListAsync(cancellationToken);
        return Result<IReadOnlyList<SecurityPriceResponse>>.Success(points.Select(p => p.ToResponse()).ToList());
    }

    public async Task<Result> DeletePriceAsync(
        DeleteSecurityPriceRequest request,
        bool isAdministrator,
        CancellationToken cancellationToken)
    {
        var id = new SecurityId(request.Id);
        var writable = await FindWritableAsync(id, isAdministrator, cancellationToken);
        if (writable.IsFailure)
        {
            return writable.Error;
        }

        var found = await db.SecurityPrices.FindOrNotFoundAsync(p => p.SecurityId == id && p.Date == request.Date, "No price is recorded for that date.", cancellationToken);
        if (!found.TryGetValue(out var point))
        {
            return found.Error;
        }

        await SecurityPriceBook.RemoveAsync(db, writable.Value!, point, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<ValueHistoryResponse> GetValueHistoryAsync(GetValueHistoryRequest request, CancellationToken cancellationToken)
    {
        var reporting = rates.ReportingCurrency;
        var today = clock.Today;
        var to = request.To is { } end && end < today ? end : today;
        var from = request.From ?? to.AddYears(-1);

        var query = db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => t.SecurityId != null && t.Date <= to && ReplayedTypes.Contains(t.Type));
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(t => t.AccountId == typedAccountId);
        }

        var entries = Portfolio.InOrder(await query.ToListAsync(cancellationToken)).ToList();
        if (entries.Count == 0 || from > to)
        {
            return new ValueHistoryResponse(reporting, []);
        }

        var start = from < entries[0].Date ? entries[0].Date : from;
        var securityIds = entries.Select(t => t.SecurityId!.Value).Distinct().ToList();
        var currencies = await db.Securities
            .AsNoTracking()
            .Where(s => securityIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Currency, cancellationToken);
        var prices = (await db.SecurityPrices
                .AsNoTracking()
                .Where(p => securityIds.Contains(p.SecurityId) && p.Date <= to)
                .OrderBy(p => p.Date)
                .ToListAsync(cancellationToken))
            .GroupBy(p => p.SecurityId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var rateHistory = await rates.GetHistoryAsync(start, to, cancellationToken);

        var books = new Dictionary<AccountId, Dictionary<SecurityId, Position>>();
        var replayed = 0;
        var points = new List<ValueHistoryPoint>();
        foreach (var date in Sample(start, to))
        {
            while (replayed < entries.Count && entries[replayed].Date <= date)
            {
                var entry = entries[replayed++];
                if (!books.TryGetValue(entry.AccountId, out var book))
                {
                    book = books[entry.AccountId] = [];
                }

                Portfolio.Apply(book, entry);
            }

            var table = rateHistory.OnOrBefore(date);
            var (value, cost) = (0m, 0m);
            var isPartial = false;
            foreach (var position in books.Values.SelectMany(book => book.Values))
            {
                isPartial |= position.IsOversold;
                if (position.Quantity == 0m)
                {
                    continue;
                }

                var price = PriceOnOrBefore(prices.GetValueOrDefault(position.SecurityId), date);
                if (position.Value(price, currencies[position.SecurityId], table, reporting).Reporting is not { } converted)
                {
                    isPartial = true;
                    continue;
                }

                value += converted;
                cost += position.ReportingCostBasis;
            }

            points.Add(new ValueHistoryPoint(date, value, Money.Round(cost), isPartial));
        }

        return new ValueHistoryResponse(reporting, points);
    }

    private static List<DateOnly> Sample(DateOnly start, DateOnly end)
    {
        var days = end.DayNumber - start.DayNumber;
        var dates = new List<DateOnly>();
        for (var index = 0; ; index++)
        {
            var date = days <= DailyUpToDays
                ? end.AddDays(-index)
                : days <= WeeklyUpToDays ? end.AddDays(-7 * index) : end.AddMonths(-index);
            if (date < start)
            {
                break;
            }

            dates.Add(date);
        }

        if (dates[^1] != start)
        {
            dates.Add(start);
        }

        dates.Reverse();
        return dates;
    }

    private static decimal? PriceOnOrBefore(List<SecurityPrice>? history, DateOnly date)
    {
        if (history is null)
        {
            return null;
        }

        var (low, high) = (0, history.Count - 1);
        decimal? found = null;
        while (low <= high)
        {
            var middle = (low + high) / 2;
            if (history[middle].Date <= date)
            {
                found = history[middle].Price;
                low = middle + 1;
            }
            else
            {
                high = middle - 1;
            }
        }

        return found;
    }

    private async Task<Result<Security>> FindWritableAsync(
        SecurityId id,
        bool isAdministrator,
        CancellationToken cancellationToken)
    {
        var found = await db.Securities.FindOrNotFoundAsync(s => s.Id == id, "Security not found.", cancellationToken);
        if (!found.TryGetValue(out var security))
        {
            return found.Error;
        }

        if (!isAdministrator && !await HoldsAsync(id, cancellationToken))
        {
            return new DomainError(ErrorCodes.SecurityNotHeld, NotHeldMessage);
        }

        return security;
    }

    private async Task<bool> HoldsAsync(SecurityId securityId, CancellationToken cancellationToken)
    {
        var history = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => t.SecurityId == securityId && ReplayedTypes.Contains(t.Type))
            .ToListAsync(cancellationToken);

        return history
            .GroupBy(t => t.AccountId)
            .Any(account => Portfolio.Positions(account).GetValueOrDefault(securityId)?.Quantity > 0m);
    }
}
