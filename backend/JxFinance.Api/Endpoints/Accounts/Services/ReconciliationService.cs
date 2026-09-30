using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.GetReconciliationPreview;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Mappers;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts.Services;

[RegisterService<IReconciliationService>(LifeTime.Scoped)]
public sealed class ReconciliationService(AppDbContext db) : IReconciliationService
{
    public const int MaxPreviewRows = 100;
    public const int MaxListed = 24;

    private static readonly DomainError AccountNotFound = EntityLookup.NotFound("Account not found.");

    public async Task<Result<ReconciliationPreviewResponse>> PreviewAsync(
        Guid accountId,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        if (await FindAccountAsync(accountId, cancellationToken) is not { } account)
        {
            return AccountNotFound;
        }

        var previous = await db.AccountReconciliations
            .AsNoTracking()
            .Where(r => r.AccountId == account.Id && r.Date < date)
            .OrderByDescending(r => r.Date)
            .FirstOrDefaultAsync(cancellationToken);
        var (rows, count) = await AccountMovements.ListAsync(
            db,
            account.Id,
            account.Currency,
            previous?.Date,
            date,
            MaxPreviewRows,
            cancellationToken);

        return new ReconciliationPreviewResponse(
            date,
            account.Currency,
            await LedgerOnAsync(account, date, cancellationToken),
            previous?.ToResponse(await LedgerOnAsync(account, previous.Date, cancellationToken)),
            rows,
            count);
    }

    public async Task<Result<IReadOnlyList<ReconciliationResponse>>> ListAsync(
        Guid accountId,
        CancellationToken cancellationToken)
    {
        if (await FindAccountAsync(accountId, cancellationToken) is not { } account)
        {
            return AccountNotFound;
        }

        var saved = await db.AccountReconciliations
            .AsNoTracking()
            .Where(r => r.AccountId == account.Id)
            .OrderByDescending(r => r.Date)
            .Take(MaxListed)
            .ToListAsync(cancellationToken);
        if (saved.Count == 0)
        {
            return new List<ReconciliationResponse>();
        }

        var earliest = saved[^1].Date;
        var opening = await LedgerOnAsync(account, earliest, cancellationToken);
        var daily = await AccountMovements.SumByDateAsync(db, [account.Id], earliest, saved[0].Date, cancellationToken);
        return saved
            .Select(r => r.ToResponse(opening + daily
                .Where(m => m.Currency == account.Currency && m.Date <= r.Date)
                .Sum(m => m.Amount)))
            .ToList();
    }

    public async Task<Result<ReconciliationResponse>> RecordAsync(
        Guid accountId,
        DateOnly date,
        decimal balance,
        ReconciliationSource source,
        CancellationToken cancellationToken)
    {
        await using var owned = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(cancellationToken)
            : null;
        await db.Database.LockAsync(accountId, cancellationToken);
        if (await FindAccountAsync(accountId, cancellationToken) is not { } account)
        {
            return AccountNotFound;
        }

        var saved = await db.AccountReconciliations
            .FirstOrDefaultAsync(r => r.AccountId == account.Id && r.Date == date, cancellationToken);
        if (saved is null)
        {
            saved = new AccountReconciliation { AccountId = account.Id, Date = date };
            db.AccountReconciliations.Add(saved);
        }

        saved.Balance = new Money(balance, account.Currency);
        saved.Source = source;
        await db.SaveChangesAsync(cancellationToken);
        if (owned is not null)
        {
            await owned.CommitAsync(cancellationToken);
        }

        return saved.ToResponse(await LedgerOnAsync(account, date, cancellationToken));
    }

    public async Task<Result> DeleteAsync(Guid accountId, Guid reconciliationId, CancellationToken cancellationToken)
    {
        var id = new AccountReconciliationId(reconciliationId);
        var account = new AccountId(accountId);
        var deleted = await db.AccountReconciliations
            .Where(r => r.Id == id && r.AccountId == account)
            .ExecuteDeleteAsync(cancellationToken);
        if (deleted == 0)
        {
            return EntityLookup.NotFound("Reconciliation not found.");
        }

        return Result.Success();
    }

    public async Task<IReadOnlyList<ReconciliationCoverage>> CoverageAsync(
        DateOnly monthEnd,
        CancellationToken cancellationToken)
    {
        var saved = await db.AccountReconciliations
            .AsNoTracking()
            .Select(r => new { r.AccountId, r.Date, r.Balance })
            .ToListAsync(cancellationToken);
        var ids = saved.Select(r => r.AccountId).Distinct().ToList();
        var accounts = await db.Accounts
            .AsNoTracking()
            .Where(a => ids.Contains(a.Id))
            .ToListAsync(cancellationToken);

        var firsts = saved.Where(r => r.Date >= monthEnd).GroupBy(r => r.AccountId).ToDictionary(g => g.Key, g => g.MinBy(r => r.Date)!);
        var daily = firsts.Count == 0
            ? []
            : await AccountMovements.SumByDateAsync(db, [.. firsts.Keys], DateOnly.MinValue, firsts.Values.Max(r => r.Date), cancellationToken);

        return accounts
            .Select(account => firsts.TryGetValue(account.Id, out var first)
                ? new ReconciliationCoverage(
                    account.Id.Value,
                    account.Name,
                    account.Currency,
                    first.Date,
                    first.Balance.Amount - account.StartingBalance.Amount - daily
                        .Where(m => m.AccountId == account.Id && m.Currency == account.Currency && m.Date <= first.Date)
                        .Sum(m => m.Amount))
                : new ReconciliationCoverage(
                    account.Id.Value,
                    account.Name,
                    account.Currency,
                    saved.Where(r => r.AccountId == account.Id).Max(r => r.Date),
                    null))
            .ToList();
    }

    private Task<Account?> FindAccountAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var id = new AccountId(accountId);
        return db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }

    private Task<decimal> LedgerOnAsync(Account account, DateOnly date, CancellationToken cancellationToken) =>
        AccountMovements.LedgerBalanceOnAsync(db, account.Id, account.StartingBalance, date, cancellationToken);
}
