using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.GetAccounts;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Mappers;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.Accounts.UpdateAccount;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts.Services;

public sealed class AccountService(AppDbContext db, ICurrentUser currentUser, AccountMapper mapper) : IAccountService
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
            var search = request.Search.Trim();
            query = query.Where(a => EF.Functions.ILike(a.Name, $"%{search}%"));
        }

        if (!string.IsNullOrWhiteSpace(request.Iban))
        {
            var iban = request.Iban.Trim();
            query = query.Where(a => a.Iban != null && EF.Functions.ILike(a.Iban, $"%{iban}%"));
        }

        if (request.Type is { } type)
        {
            query = query.Where(a => a.Type == type);
        }

        var accounts = await query
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var transactionMovements = await db.Transactions
            .GroupBy(t => t.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Net = g.Sum(t => t.Type == FlowType.Income ? (decimal)t.Amount : -(decimal)t.Amount),
            })
            .ToDictionaryAsync(g => g.AccountId, g => g.Net, cancellationToken);

        var outgoingTransfers = await db.Transfers
            .GroupBy(t => t.FromAccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(t => (decimal)t.Amount) })
            .ToDictionaryAsync(g => g.AccountId, g => g.Total, cancellationToken);

        var incomingTransfers = await db.Transfers
            .GroupBy(t => t.ToAccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(t => (decimal)t.Amount) })
            .ToDictionaryAsync(g => g.AccountId, g => g.Total, cancellationToken);

        var responses = accounts
            .Select(a => mapper.FromEntity(
                a,
                transactionMovements.GetValueOrDefault(a.Id)
                    - outgoingTransfers.GetValueOrDefault(a.Id)
                    + incomingTransfers.GetValueOrDefault(a.Id)))
            .ToList();

        return Sort(responses, request);
    }

    private static IReadOnlyList<AccountResponse> Sort(
        List<AccountResponse> accounts,
        GetAccountsRequest request)
    {
        var sort = request.Sort ?? AccountSortField.Created;
        var descending = request.Direction == SortDirection.Desc;

        if (sort == AccountSortField.Created)
        {
            return descending
                ? accounts.OrderByDescending(a => a.CreatedAt).ToList()
                : accounts;
        }

        Func<AccountResponse, IComparable?> key = sort switch
        {
            AccountSortField.Name => a => a.Name,
            AccountSortField.Iban => a => a.Iban ?? string.Empty,
            AccountSortField.Type => a => a.Type.ToString(),
            AccountSortField.StartingBalance => a => decimal.Parse(
                a.StartingBalance,
                System.Globalization.CultureInfo.InvariantCulture),
            _ => a => decimal.Parse(a.CurrentBalance, System.Globalization.CultureInfo.InvariantCulture),
        };

        return descending ? accounts.OrderByDescending(key).ToList() : accounts.OrderBy(key).ToList();
    }

    public async Task<Result<AccountResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var accountId = new AccountId(id);
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.NotFound, "Account not found.");
        }

        var net = await NetMovementAsync(accountId, cancellationToken);
        return Result<AccountResponse>.Success(mapper.FromEntity(account, net));
    }

    public async Task<Result<AccountResponse>> CreateAsync(
        CreateAccountRequest request,
        CancellationToken cancellationToken)
    {
        var membershipError = await ValidateHouseholdAsync(request.Scope, request.HouseholdId, cancellationToken);
        if (membershipError is not null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.Validation, membershipError);
        }

        var account = mapper.ToEntity(request);

        db.Accounts.Add(account);
        await db.SaveChangesAsync(cancellationToken);

        return Result<AccountResponse>.Success(mapper.FromEntity(account, 0m));
    }

    public async Task<Result<AccountResponse>> UpdateAsync(
        UpdateAccountRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.Id);
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.NotFound, "Account not found.");
        }

        var membershipError = await ValidateHouseholdAsync(request.Scope, request.HouseholdId, cancellationToken);
        if (membershipError is not null)
        {
            return Result<AccountResponse>.Failure(ErrorCodes.Validation, membershipError);
        }

        if (account.UserId != currentUser.Id &&
            (account.Scope != request.Scope || account.HouseholdId?.Value != request.HouseholdId))
        {
            return Result<AccountResponse>.Failure(ErrorCodes.Forbidden, "Only the owner can change sharing.");
        }

        mapper.UpdateEntity(request, account);
        await db.SaveChangesAsync(cancellationToken);

        var net = await NetMovementAsync(accountId, cancellationToken);
        return Result<AccountResponse>.Success(mapper.FromEntity(account, net));
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
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Account not found.");
        }

        if (account.UserId != currentUser.Id)
        {
            return Result<Guid>.Failure(ErrorCodes.Forbidden, "Only the owner can archive an account.");
        }

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private async Task<decimal> NetMovementAsync(AccountId accountId, CancellationToken cancellationToken)
    {
        var transactionNet = await db.Transactions
            .Where(t => t.AccountId == accountId)
            .SumAsync(t => t.Type == FlowType.Income ? (decimal)t.Amount : -(decimal)t.Amount, cancellationToken);

        var outgoing = await db.Transfers
            .Where(t => t.FromAccountId == accountId)
            .SumAsync(t => (decimal)t.Amount, cancellationToken);

        var incoming = await db.Transfers
            .Where(t => t.ToAccountId == accountId)
            .SumAsync(t => (decimal)t.Amount, cancellationToken);

        return transactionNet - outgoing + incoming;
    }
}
