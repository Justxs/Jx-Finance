using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.GetAccounts;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Mappers;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.Accounts.UpdateAccount;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts.Services;

[RegisterService<IAccountService>(LifeTime.Scoped)]
public sealed class AccountService(
    AppDbContext db,
    ICurrentUser currentUser,
    AccountMapper mapper,
    IExchangeRateService rates,
    IHoldingsValuation holdings) : IAccountService
{
    public Task<IReadOnlyList<AccountResponse>> GetAllAsync(CancellationToken cancellationToken) =>
        GetAllAsync(new GetAccountsRequest(), cancellationToken);

    public async Task<IReadOnlyList<AccountResponse>> GetAllAsync(
        GetAccountsRequest request,
        CancellationToken cancellationToken)
    {
        var query = db.Accounts.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = LikePattern.Contains(request.Search);
            query = query.Where(a => EF.Functions.ILike(a.Name, search, LikePattern.Escape));
        }

        if (!string.IsNullOrWhiteSpace(request.Iban))
        {
            var iban = LikePattern.Contains(request.Iban);
            query = query.Where(a => a.Iban != null && EF.Functions.ILike(a.Iban, iban, LikePattern.Escape));
        }

        if (request.Type is { } type)
        {
            query = query.Where(a => a.Type == type);
        }

        var accounts = await query
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var balances = await BalancesAsync(accounts, cancellationToken);

        return Sort(accounts, balances, request).Select(a => mapper.FromEntity(a, balances[a.Id])).ToList();
    }

    public async Task<(decimal Total, bool IsComplete)> GetReportingTotalAsync(CancellationToken cancellationToken)
    {
        var accounts = await db.Accounts.ToListAsync(cancellationToken);
        var balances = (await BalancesAsync(accounts, cancellationToken)).Values;
        return (balances.Sum(b => b.Reporting.Amount), balances.All(b => b.IsComplete));
    }

    private static IEnumerable<Account> Sort(
        List<Account> accounts,
        Dictionary<AccountId, AccountBalance> balances,
        GetAccountsRequest request)
    {
        Func<Account, IComparable?>? key = request.Sort switch
        {
            AccountSortField.Name => a => a.Name,
            AccountSortField.Iban => a => a.Iban ?? string.Empty,
            AccountSortField.Type => a => a.Type.ToString(),
            AccountSortField.StartingBalance => a => balances[a.Id].StartingReporting,
            AccountSortField.CurrentBalance => a => balances[a.Id].Reporting.Amount,
            _ => a => a.CreatedAt,
        };

        return request.Direction == SortDirection.Desc ? accounts.OrderByDescending(key) : accounts.OrderBy(key);
    }

    public async Task<Result<AccountResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var accountId = new AccountId(id);
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.ResourceNotFound, "Account not found.");
        }

        return Result<AccountResponse>.Success(mapper.FromEntity(account, await BalanceAsync(account, cancellationToken)));
    }

    public async Task<Result<AccountResponse>> CreateAsync(
        CreateAccountRequest request,
        CancellationToken cancellationToken)
    {
        var membershipError = await ValidateHouseholdAsync(request.Scope, request.HouseholdId, cancellationToken);
        if (membershipError is not null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.HouseholdNotMember, membershipError);
        }

        var account = mapper.ToEntity(request);
        if (rates.UnusableReason(account.Currency) is { } currencyError)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.CurrencyDisabled, currencyError);
        }

        db.Accounts.Add(account);
        await db.SaveChangesAsync(cancellationToken);

        return Result<AccountResponse>.Success(mapper.FromEntity(account, await BalanceAsync(account, cancellationToken)));
    }

    public async Task<Result<AccountResponse>> UpdateAsync(
        UpdateAccountRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.Id);
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.ResourceNotFound, "Account not found.");
        }

        var membershipError = await ValidateHouseholdAsync(request.Scope, request.HouseholdId, cancellationToken);
        if (membershipError is not null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.HouseholdNotMember, membershipError);
        }

        if (account.UserId != currentUser.Id &&
            (account.Scope != request.Scope || account.HouseholdId?.Value != request.HouseholdId))
        {
            return Result<AccountResponse>.Failure(ErrorCodes.AccessForbidden, "Only the owner can change sharing.");
        }

        if (request.Currency is { } currency && currency != account.Currency && rates.UnusableReason(currency) is { } currencyError)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.CurrencyDisabled, currencyError);
        }

        mapper.UpdateEntity(request, account);
        await db.SaveChangesAsync(cancellationToken);

        return Result<AccountResponse>.Success(mapper.FromEntity(account, await BalanceAsync(account, cancellationToken)));
    }

    private async Task<string?> ValidateHouseholdAsync(
        Scope scope,
        Guid? householdId,
        CancellationToken cancellationToken)
    {
        if (scope == Scope.Personal || householdId is null)
        {
            return null;
        }

        var typedHouseholdId = new HouseholdId(householdId.Value);
        var isMember = await db.HouseholdMemberships.AnyAsync(
            m => m.HouseholdId == typedHouseholdId && m.UserId == currentUser.Id,
            cancellationToken);

        return isMember ? null : "You are not a member of that household.";
    }

    public async Task<Result<Guid>> ArchiveAsync(Guid id, CancellationToken cancellationToken)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == new AccountId(id), cancellationToken);
        if (account is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Account not found.");
        }

        if (account.UserId != currentUser.Id)
        {
            return Result<Guid>.Failure(ErrorCodes.AccessForbidden, "Only the owner can archive an account.");
        }

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private async Task<AccountBalance> BalanceAsync(Account account, CancellationToken cancellationToken) =>
        (await BalancesAsync([account], cancellationToken))[account.Id];

    private async Task<Dictionary<AccountId, AccountBalance>> BalancesAsync(
        IReadOnlyList<Account> accounts,
        CancellationToken cancellationToken)
    {
        var ids = accounts.Select(a => a.Id).ToList();
        var movements = new Dictionary<(AccountId Account, Currency Currency), decimal>();

        void Apply(AccountId account, Currency currency, decimal amount) =>
            movements[(account, currency)] = movements.GetValueOrDefault((account, currency)) + amount;

        foreach (var account in accounts)
        {
            Apply(account.Id, account.Currency, account.StartingBalance.Amount);
        }

        var transactions = await db.Transactions
            .Where(t => ids.Contains(t.AccountId))
            .GroupBy(t => new { t.AccountId, t.Amount.Currency })
            .Select(g => new
            {
                g.Key.AccountId,
                g.Key.Currency,
                Net = g.Sum(t => t.Type == FlowType.Income ? t.Amount.Amount : -t.Amount.Amount),
            })
            .ToListAsync(cancellationToken);
        transactions.ForEach(m => Apply(m.AccountId, m.Currency, m.Net));

        var outgoing = await db.Transfers
            .Where(t => ids.Contains(t.FromAccountId))
            .GroupBy(t => new { AccountId = t.FromAccountId, t.Amount.Currency })
            .Select(g => new { g.Key.AccountId, g.Key.Currency, Total = g.Sum(t => t.Amount.Amount) })
            .ToListAsync(cancellationToken);
        outgoing.ForEach(m => Apply(m.AccountId, m.Currency, -m.Total));

        var incoming = await db.Transfers
            .Where(t => ids.Contains(t.ToAccountId))
            .GroupBy(t => new { AccountId = t.ToAccountId, t.ReceivedAmount.Currency })
            .Select(g => new { g.Key.AccountId, g.Key.Currency, Total = g.Sum(t => t.ReceivedAmount.Amount) })
            .ToListAsync(cancellationToken);
        incoming.ForEach(m => Apply(m.AccountId, m.Currency, m.Total));

        var sold = await db.CurrencyConversions
            .Where(c => ids.Contains(c.AccountId))
            .GroupBy(c => new { c.AccountId, c.FromAmount.Currency })
            .Select(g => new { g.Key.AccountId, g.Key.Currency, Total = g.Sum(c => c.FromAmount.Amount) })
            .ToListAsync(cancellationToken);
        sold.ForEach(m => Apply(m.AccountId, m.Currency, -m.Total));

        var bought = await db.CurrencyConversions
            .Where(c => ids.Contains(c.AccountId))
            .GroupBy(c => new { c.AccountId, c.ToAmount.Currency })
            .Select(g => new { g.Key.AccountId, g.Key.Currency, Total = g.Sum(c => c.ToAmount.Amount) })
            .ToListAsync(cancellationToken);
        bought.ForEach(m => Apply(m.AccountId, m.Currency, m.Total));

        var invested = await db.InvestmentTransactions
            .Where(t => ids.Contains(t.AccountId))
            .GroupBy(t => new { t.AccountId, t.CashAmount.Currency })
            .Select(g => new { g.Key.AccountId, g.Key.Currency, Total = g.Sum(t => t.CashAmount.Amount) })
            .ToListAsync(cancellationToken);
        invested.ForEach(m => Apply(m.AccountId, m.Currency, m.Total));

        var holdingValues = await holdings.ValueAsync(ids, cancellationToken);

        var latest = await rates.GetLatestAsync(cancellationToken);
        var reporting = rates.ReportingCurrency;

        return accounts.ToDictionary(
            account => account.Id,
            account =>
            {
                var held = movements
                    .Where(m => m.Key.Account == account.Id && (m.Value != 0m || m.Key.Currency == account.Currency))
                    .Select(m => new Money(m.Value, m.Key.Currency))
                    .OrderBy(m => m.Currency == account.Currency ? 0 : 1)
                    .ThenBy(m => m.Currency.ToCode(), StringComparer.Ordinal)
                    .ToList();

                (decimal Value, bool IsComplete) holdingValue = holdingValues.GetValueOrDefault(account.Id, (0m, true));
                decimal? In(Money money, Currency currency) => latest.Convert(money.Amount, money.Currency, currency);

                return new AccountBalance(
                    held,
                    new Money(held.Sum(m => In(m, account.Currency) ?? 0m), account.Currency),
                    new Money(held.Sum(m => In(m, reporting) ?? 0m) + holdingValue.Value, reporting),
                    new Money(holdingValue.Value, reporting),
                    In(account.StartingBalance, reporting) ?? 0m,
                    holdingValue.IsComplete && held.All(m => In(m, reporting) is not null));
            });
    }
}
