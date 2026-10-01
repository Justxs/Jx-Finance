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
        Currency? currency,
        CancellationToken cancellationToken)
    {
        if (await FindAccountAsync(accountId, cancellationToken) is not { } account)
        {
            return AccountNotFound;
        }

        var shown = currency ?? account.Currency;
        var previous = await db.AccountReconciliations
            .AsNoTracking()
            .Where(r => r.AccountId == account.Id && r.Currency == shown && r.Date < date)
            .OrderByDescending(r => r.Date)
            .FirstOrDefaultAsync(cancellationToken);
        var (rows, count) = await AccountMovements.ListAsync(
            db,
            account.Id,
            shown,
            previous?.Date,
            date,
            MaxPreviewRows,
            cancellationToken);

        return new ReconciliationPreviewResponse(
            date,
            shown,
            await LedgerOnAsync(account, shown, date, cancellationToken),
            previous?.ToResponse(await LedgerOnAsync(account, shown, previous.Date, cancellationToken)),
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
        var opening = await AccountMovements.SumAsync(db, [account.Id], earliest, cancellationToken);
        var daily = await AccountMovements.SumByDateAsync(db, [account.Id], earliest, saved[0].Date, cancellationToken);
        return saved
            .Select(r => r.ToResponse(
                AccountMovements.BalanceOf(AccountMovements.StartingIn(account.StartingBalance, r.Currency), opening)
                + daily
                    .Where(m => m.Currency == r.Currency && m.Date <= r.Date)
                    .Sum(m => m.Amount)))
            .ToList();
    }

    public async Task<Result<ReconciliationResponse>> RecordAsync(
        Guid accountId,
        DateOnly date,
        decimal balance,
        Currency? currency,
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

        var recorded = currency ?? account.Currency;
        var saved = await db.AccountReconciliations
            .FirstOrDefaultAsync(
                r => r.AccountId == account.Id && r.Currency == recorded && r.Date == date,
                cancellationToken);
        if (saved is null)
        {
            saved = new AccountReconciliation { AccountId = account.Id, Currency = recorded, Date = date };
            db.AccountReconciliations.Add(saved);
        }

        saved.Balance = balance;
        saved.Source = source;
        await db.SaveChangesAsync(cancellationToken);
        if (owned is not null)
        {
            await owned.CommitAsync(cancellationToken);
        }

        return saved.ToResponse(await LedgerOnAsync(account, recorded, date, cancellationToken));
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
            .Select(r => new { r.AccountId, r.Currency, r.Date, r.Balance })
            .ToListAsync(cancellationToken);
        var ids = saved.Select(r => r.AccountId).Distinct().ToList();
        var accounts = await db.Accounts
            .AsNoTracking()
            .Where(a => ids.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, cancellationToken);

        var firsts = saved
            .Where(r => r.Date >= monthEnd)
            .GroupBy(r => (r.AccountId, r.Currency))
            .ToDictionary(g => g.Key, g => g.MinBy(r => r.Date)!);
        var daily = firsts.Count == 0
            ? []
            : await AccountMovements.SumByDateAsync(
                db,
                [.. firsts.Keys.Select(k => k.AccountId).Distinct()],
                DateOnly.MinValue,
                firsts.Values.Max(r => r.Date),
                cancellationToken);

        return saved
            .Where(r => accounts.ContainsKey(r.AccountId))
            .GroupBy(r => (r.AccountId, r.Currency))
            .Select(group =>
            {
                var account = accounts[group.Key.AccountId];
                var currency = group.Key.Currency;
                return firsts.TryGetValue(group.Key, out var first)
                    ? new ReconciliationCoverage(
                        account.Id.Value,
                        account.Name,
                        account.Currency,
                        currency,
                        first.Date,
                        first.Balance - AccountMovements.StartingIn(account.StartingBalance, currency).Amount - daily
                            .Where(m => m.AccountId == account.Id && m.Currency == currency && m.Date <= first.Date)
                            .Sum(m => m.Amount))
                    : new ReconciliationCoverage(
                        account.Id.Value,
                        account.Name,
                        account.Currency,
                        currency,
                        group.Max(r => r.Date),
                        null);
            })
            .ToList();
    }

    private Task<Account?> FindAccountAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var id = new AccountId(accountId);
        return db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }

    private Task<decimal> LedgerOnAsync(Account account, Currency currency, DateOnly date, CancellationToken cancellationToken) =>
        AccountMovements.LedgerBalanceOnAsync(db, account.Id, account.StartingBalance, currency, date, cancellationToken);
}
