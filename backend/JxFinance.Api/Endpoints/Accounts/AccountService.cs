using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.UpdateAccount;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts;

public sealed class AccountService(AppDbContext db) : IAccountService
{
    public async Task<IReadOnlyList<AccountResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var accounts = await db.Accounts
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var movements = await db.Transactions
            .GroupBy(t => t.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Net = g.Sum(t => t.Type == FlowType.Income ? (decimal)t.Amount : -(decimal)t.Amount),
            })
            .ToDictionaryAsync(g => g.AccountId, g => g.Net, cancellationToken);

        return accounts
            .Select(a => ToResponse(a, movements.GetValueOrDefault(a.Id)))
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
        var account = new Account
        {
            Name = request.Name.Trim(),
            Description = NormalizeText(request.Description),
            Iban = Iban.Normalize(request.Iban),
            Type = request.Type,
            StartingBalance = MoneyWire.Parse(request.StartingBalance),
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

        account.Name = request.Name.Trim();
        account.Description = NormalizeText(request.Description);
        account.Iban = Iban.Normalize(request.Iban);
        account.Type = request.Type;
        account.StartingBalance = MoneyWire.Parse(request.StartingBalance);
        await db.SaveChangesAsync(cancellationToken);

        var net = await NetMovementAsync(accountId, cancellationToken);
        return Result<AccountResponse>.Success(ToResponse(account, net));
    }

    public async Task<Result<Guid>> ArchiveAsync(Guid id, CancellationToken cancellationToken)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == new AccountId(id), cancellationToken);
        if (account is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Account not found.");
        }

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private Task<decimal> NetMovementAsync(AccountId accountId, CancellationToken cancellationToken) =>
        db.Transactions
            .Where(t => t.AccountId == accountId)
            .SumAsync(t => t.Type == FlowType.Income ? (decimal)t.Amount : -(decimal)t.Amount, cancellationToken);

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
        account.CreatedAt);
}
