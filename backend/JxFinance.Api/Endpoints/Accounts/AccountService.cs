using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.UpdateAccount;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts;

public sealed class AccountService(AppDbContext db, ICurrentUser currentUser) : IAccountService
{
    public async Task<IReadOnlyList<AccountResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var accounts = await db.Accounts
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

        return accounts
            .Select(a => ToResponse(
                a,
                transactionMovements.GetValueOrDefault(a.Id)
                    - outgoingTransfers.GetValueOrDefault(a.Id)
                    + incomingTransfers.GetValueOrDefault(a.Id)))
            .ToList();
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
        return Result<AccountResponse>.Success(ToResponse(account, net));
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

        var account = new Account
        {
            Name = request.Name.Trim(),
            Description = NormalizeText(request.Description),
            Iban = Iban.Normalize(request.Iban),
            Type = request.Type,
            StartingBalance = MoneyWire.Parse(request.StartingBalance),
            Scope = request.Scope,
            HouseholdId = request.Scope == Scope.Shared ? new HouseholdId(request.HouseholdId!.Value) : null,
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(cancellationToken);

        return Result<AccountResponse>.Success(ToResponse(account, 0m));
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

        account.Name = request.Name.Trim();
        account.Description = NormalizeText(request.Description);
        account.Iban = Iban.Normalize(request.Iban);
        account.Type = request.Type;
        account.StartingBalance = MoneyWire.Parse(request.StartingBalance);
        account.Scope = request.Scope;
        account.HouseholdId = request.Scope == Scope.Shared ? new HouseholdId(request.HouseholdId!.Value) : null;
        await db.SaveChangesAsync(cancellationToken);

        var net = await NetMovementAsync(accountId, cancellationToken);
        return Result<AccountResponse>.Success(ToResponse(account, net));
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

    private static string? NormalizeText(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static AccountResponse ToResponse(Account account, decimal netMovement) => new(
        account.Id.Value,
        account.Name,
        account.Description,
        account.Iban,
        account.Type,
        MoneyWire.ToWire(account.StartingBalance),
        MoneyWire.ToWire(account.StartingBalance + netMovement),
        account.CreatedAt,
        account.Scope,
        account.HouseholdId?.Value);
}
