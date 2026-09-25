using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
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
    ISharingGuard sharing,
    IExchangeRateService rates,
    IHoldingsValuation holdings) : IAccountService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Account not found.");

    private static readonly DomainError OnlyOwnerArchives =
        new(ErrorCodes.AccessForbidden, "Only the owner can archive an account.");

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

        return Sort(accounts, balances, request).Select(a => a.ToResponse(balances[a.Id])).ToList();
    }

    public async Task<(decimal Total, bool IsComplete)> GetReportingTotalAsync(CancellationToken cancellationToken)
    {
        var accounts = await db.Accounts.AsNoTracking().ToListAsync(cancellationToken);
        var balances = (await BalancesAsync(accounts, cancellationToken)).Values;
        return (balances.Sum(b => b.Reporting.Amount), balances.All(b => b.IsComplete));
    }

    public async Task<IReadOnlyDictionary<AccountId, decimal>> GetReportingBalancesAsync(
        IReadOnlyCollection<AccountId> accountIds,
        CancellationToken cancellationToken)
    {
        var wanted = accountIds.Distinct().ToList();
        if (wanted.Count == 0)
        {
            return new Dictionary<AccountId, decimal>();
        }

        var accounts = await db.Accounts.AsNoTracking().Where(a => wanted.Contains(a.Id)).ToListAsync(cancellationToken);
        var balances = await BalancesAsync(accounts, cancellationToken);

        return balances.ToDictionary(entry => entry.Key, entry => entry.Value.Reporting.Amount);
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
        if (await FindAsync(id, cancellationToken) is not { } account)
        {
            return NotFound;
        }

        return account.ToResponse(await BalanceAsync(account, cancellationToken));
    }

    public async Task<Result<AccountResponse>> CreateAsync(
        CreateAccountRequest request,
        CancellationToken cancellationToken)
    {
        if (await sharing.CheckAsync(request, cancellationToken) is { } sharingError)
        {
            return sharingError;
        }

        var currency = request.Currency ?? rates.ReportingCurrency;
        if (rates.UnusableReason(currency) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var account = request.ToEntity(rates.ReportingCurrency);
        db.Accounts.Add(account);
        await db.SaveChangesAsync(cancellationToken);

        return account.ToResponse(await BalanceAsync(account, cancellationToken));
    }

    public async Task<Result<AccountResponse>> UpdateAsync(
        UpdateAccountRequest request,
        CancellationToken cancellationToken)
    {
        if (await FindAsync(request.Id, cancellationToken) is not { } account)
        {
            return NotFound;
        }

        if (await sharing.CheckAsync(account, request, cancellationToken) is { } sharingError)
        {
            return sharingError;
        }

        if (request.Currency is { } currency
            && currency != account.Currency
            && rates.UnusableReason(currency) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        request.ApplyTo(account);
        await db.SaveChangesAsync(cancellationToken);

        return account.ToResponse(await BalanceAsync(account, cancellationToken));
    }

    public Task<Result<Guid>> ArchiveAsync(Guid id, CancellationToken cancellationToken) =>
        db.DeleteOrNotFoundAsync<Account>(
            id,
            a => a.Id == new AccountId(id),
            NotFound.Message,
            account => Task.FromResult(account.UserId == currentUser.Id ? null : OnlyOwnerArchives),
            cancellationToken);

    public async Task<IReadOnlyList<ArchivedAccountResponse>> GetArchivedAsync(CancellationToken cancellationToken)
    {
        var accounts = await ArchivedAccounts()
            .OrderBy(a => a.Name)
            .ThenBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return accounts.Select(a => new ArchivedAccountResponse(
            a.Id.Value,
            a.Name,
            a.Description,
            a.Iban,
            a.Type,
            a.StartingBalance.Amount,
            a.Currency,
            a.Scope,
            a.HouseholdId?.Value,
            a.UpdatedAt,
            a.UserId == currentUser.Id)).ToList();
    }

    public async Task<Result<AccountResponse>> RestoreAsync(Guid id, CancellationToken cancellationToken)
    {
        var accountId = new AccountId(id);
        var active = await db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (active is not null)
        {
            return active.ToResponse(await BalanceAsync(active, cancellationToken));
        }

        if (await ArchivedAccounts().FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken) is not { } account)
        {
            return NotFound;
        }

        if (account.UserId != currentUser.Id)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the owner can restore an account.");
        }

        if (account.Scope == Scope.Shared &&
            (account.HouseholdId is not { } householdId ||
                !await db.Households.AnyAsync(h => h.Id == householdId, cancellationToken)))
        {
            account.Scope = Scope.Personal;
            account.HouseholdId = null;
        }

        account.IsDeleted = false;
        await db.SaveChangesAsync(cancellationToken);

        return account.ToResponse(await BalanceAsync(account, cancellationToken));
    }

    private Task<Account?> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        var accountId = new AccountId(id);
        return db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
    }

    private IQueryable<Account> ArchivedAccounts()
    {
        var userId = currentUser.Id;
        var activeHouseholdId = currentUser.ActiveHouseholdId;

        return db.Accounts
            .IgnoreQueryFilters()
            .Where(a => a.IsDeleted)
            .Where(a => a.UserId == userId ||
                (a.Scope == Scope.Shared && a.HouseholdId != null &&
                    db.HouseholdMemberships.Any(m =>
                        !m.IsDeleted && m.HouseholdId == a.HouseholdId && m.UserId == userId) &&
                    db.HouseholdMemberships.Any(m =>
                        !m.IsDeleted && m.HouseholdId == a.HouseholdId && m.UserId == a.UserId) &&
                    db.Households.Any(h => !h.IsDeleted && h.Id == a.HouseholdId)))
            .Where(a => activeHouseholdId == null || a.Scope == Scope.Personal || a.HouseholdId == activeHouseholdId);
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

        var moved = await AccountMovements.SumAsync(db, ids, cancellationToken);
        moved.ForEach(m => Apply(m.AccountId, m.Currency, m.Amount));

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
