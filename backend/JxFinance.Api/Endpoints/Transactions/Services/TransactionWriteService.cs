using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Refunds;
using JxFinance.Common.Settings;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;
using JxFinance.Endpoints.Transactions.BulkDeleteTransactions;
using JxFinance.Endpoints.Transactions.BulkMoveTransactions;
using JxFinance.Endpoints.Transactions.BulkTagTransactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transactions.Services;

[RegisterService<ITransactionWriteService>(LifeTime.Scoped)]
public sealed class TransactionWriteService(
    AppDbContext db,
    ICurrentUser currentUser,
    ITransactionValuation valuations,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IInstanceSettingsStore settings,
    IClock clock) : ITransactionWriteService
{
    private static readonly DomainError NotFound = TransactionResponses.NotFound;

    public async Task<Result<Guid>> SetUnusualDismissedAsync(
        Guid id,
        bool dismissed,
        CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        DateTimeOffset? dismissedAt = dismissed ? clock.UtcNow : null;
        var changed = await db.Transactions
            .Where(t => t.Id == transactionId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UnusualDismissedAt, dismissedAt), cancellationToken);

        return changed == 0 ? NotFound : id;
    }

    public async Task<Result<Guid>> KeepPossibleDuplicatesAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        if (!await db.Transactions.AnyAsync(t => t.Id == transactionId, cancellationToken))
        {
            return NotFound;
        }

        var others = await PossibleDuplicates.Pairs(db)
            .Where(p => p.Id == transactionId)
            .Select(p => p.OtherId)
            .Distinct()
            .ToListAsync(cancellationToken);
        db.DuplicateDismissals.AddRange(others.Select(other => new DuplicateDismissal { TransactionId = transactionId, OtherTransactionId = other }));
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    public async Task<Result<TransactionResponse>> CreateAsync(
        CreateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        if (await ValidateInputAsync(request, null, cancellationToken) is { } inputError)
        {
            return inputError;
        }

        var valuation = await ValueAsync(request.AccountId, request.Currency, null, request.Amount, request.Date, cancellationToken);
        if (valuation.IsFailure)
        {
            return valuation.Error;
        }

        var (currency, reportingAmount) = valuation.Value;
        var transaction = request.ToEntity(currency, reportingAmount);
        if (settings.LocationsEnabled())
        {
            request.ApplyPlaceTo(transaction);
        }

        if (currentUser.TokenName is not null)
        {
            transaction.Source = TransactionSource.Api;
        }

        db.Transactions.Add(transaction);
        AddChildren(request, transaction.Id, currency);
        await db.SaveChangesAsync(cancellationToken);

        return await TransactionResponses.ResponseAsync(db, currentUser, settings, transaction, cancellationToken);
    }

    public async Task<Result<TransactionResponse>> UpdateAsync(
        UpdateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(request.Id);
        if (await TransactionResponses.FindAsync(db, transactionId, cancellationToken) is not { } transaction)
        {
            return NotFound;
        }

        if (await ValidateInputAsync(request, transactionId, cancellationToken) is { } inputError)
        {
            return inputError;
        }

        var valuation = await ValueAsync(
            request.AccountId,
            request.Currency,
            transaction.Amount.Currency,
            request.Amount,
            request.Date,
            cancellationToken);
        if (valuation.IsFailure)
        {
            return valuation.Error;
        }

        var (currency, reportingAmount) = valuation.Value;

        db.TransactionLines.RemoveRange(
            await db.TransactionLines.Where(l => l.TransactionId == transactionId).ToListAsync(cancellationToken));
        db.TransactionTags.RemoveRange(
            await db.TransactionTags.Where(x => x.TransactionId == transactionId).ToListAsync(cancellationToken));

        request.ApplyTo(transaction, currency, reportingAmount);
        if (settings.LocationsEnabled())
        {
            request.ApplyPlaceTo(transaction);
        }

        AddChildren(request, transactionId, currency);

        if (await db.SaveOrStaleAsync(transaction, request.Version, cancellationToken) is { } stale)
        {
            return stale;
        }

        return await TransactionResponses.ResponseAsync(db, currentUser, settings, transaction, cancellationToken);
    }

    public async Task<Result<int>> BulkCategorizeAsync(
        BulkCategorizeTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var loaded = await LoadForBulkAsync(request.TransactionIds, cancellationToken);
        if (!loaded.TryGetValue(out var transactions))
        {
            return loaded.Error;
        }

        if (transactions.Any(t => t.IsSplit))
        {
            return new DomainError(ErrorCodes.TransactionSplitNotAllowed, "Split transactions cannot be bulk-recategorized.");
        }

        foreach (var type in transactions.Select(t => t.Type).Distinct())
        {
            var categoryError = await ValidateCategoryAsync(request.CategoryId, type, cancellationToken);
            if (categoryError is not null)
            {
                return categoryError;
            }
        }

        CategoryId? categoryId = request.CategoryId is { } value ? new CategoryId(value) : null;
        var changing = request.OnlyUncategorized ? transactions.Where(t => t.CategoryId == null).ToList() : transactions;
        if (changing.Count == 0)
        {
            return 0;
        }

        foreach (var transaction in changing)
        {
            transaction.CategoryId = categoryId;
        }

        var categoryName = categoryId is { } chosen
            ? await db.Categories.Where(c => c.Id == chosen).Select(c => c.Name).FirstOrDefaultAsync(cancellationToken)
            : null;
        db.Audit.Summarise(
            AuditAction.Updated,
            AuditEntityKind.Transaction,
            TrashLabel.Counted(
                categoryName is null ? "Category cleared" : $"Category set to {categoryName}",
                (changing.Count, "transaction", "transactions")),
            changing.Count,
            accounts: changing.Select(t => t.AccountId));
        await db.SaveChangesAsync(cancellationToken);

        return changing.Count;
    }

    public async Task<Result<int>> BulkTagAsync(
        BulkTagTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var loaded = await LoadForBulkAsync(request.TransactionIds, cancellationToken);
        if (!loaded.TryGetValue(out var transactions))
        {
            return loaded.Error;
        }

        var tagError = await references.TagsExistAsync(request.TagIds ?? [], cancellationToken);
        if (tagError is not null)
        {
            return tagError;
        }

        var ids = transactions.Select(t => t.Id).ToList();

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        await db.TransactionTags.Where(x => ids.Contains(x.TransactionId)).ExecuteDeleteAsync(cancellationToken);
        db.TransactionTags.AddRange(ids.SelectMany(id => request.TagIds.ToTransactionTags(id)));
        var wanted = (request.TagIds ?? []).Distinct().Select(id => new TagId(id)).ToList();
        var tagNames = await db.Tags.Where(t => wanted.Contains(t.Id)).Select(t => t.Name).OrderBy(n => n).ToListAsync(cancellationToken);
        db.Audit.Summarise(
            AuditAction.Updated,
            AuditEntityKind.Transaction,
            TrashLabel.Counted(
                tagNames.Count == 0 ? "Tags cleared" : $"Tags set to {string.Join(", ", tagNames)}",
                (transactions.Count, "transaction", "transactions")),
            transactions.Count,
            accounts: transactions.Select(t => t.AccountId));
        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return transactions.Count;
    }

    public async Task<Result<int>> BulkDeleteAsync(
        BulkDeleteTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var loaded = await LoadForBulkAsync(request.TransactionIds, cancellationToken);
        if (!loaded.TryGetValue(out var transactions))
        {
            return loaded.Error;
        }

        foreach (var transaction in transactions)
        {
            deletions.Record(
                TrashKind.Transaction,
                transaction.Id.Value,
                TrashLabel.Dated(transaction.Description, transaction.Date, transaction.Amount));
        }

        db.Transactions.RemoveRange(transactions);
        db.Audit.Summarise(
            AuditAction.Deleted,
            AuditEntityKind.Transaction,
            TrashLabel.Counted("Selection deleted", (transactions.Count, "transaction", "transactions")),
            transactions.Count,
            accounts: transactions.Select(t => t.AccountId));
        await db.SaveChangesAsync(cancellationToken);

        return transactions.Count;
    }

    public async Task<Result<BulkMoveTransactionsResponse>> BulkMoveAsync(
        BulkMoveTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var loaded = await LoadForBulkAsync(request.TransactionIds, cancellationToken);
        if (!loaded.TryGetValue(out var transactions))
        {
            return loaded.Error;
        }

        var targetId = new AccountId(request.AccountId);
        if (await references.AccountExistsAsync(targetId, cancellationToken) is { } accountError)
        {
            return accountError;
        }

        var target = await db.Accounts.AsNoTracking().FirstAsync(a => a.Id == targetId, cancellationToken);
        var moving = transactions.Where(t => t.AccountId != targetId).ToList();
        var refusals = await AccountMoves.RefusalsAsync(db, moving, target, cancellationToken);
        var moved = moving.Where(t => !refusals.ContainsKey(t.Id)).ToList();
        if (moved.Count > 0)
        {
            var touched = moved.Select(t => t.AccountId).Append(targetId).ToList();
            foreach (var transaction in moved)
            {
                transaction.AccountId = targetId;
            }

            db.Audit.Summarise(
                AuditAction.Updated,
                AuditEntityKind.Transaction,
                TrashLabel.Counted($"Moved to {target.Name}", (moved.Count, "transaction", "transactions")),
                moved.Count,
                accounts: touched);
            await db.SaveChangesAsync(cancellationToken);
        }

        return new BulkMoveTransactionsResponse(
            moved.Count,
            [.. refusals.Select(r => new TransactionRefusalResponse(r.Key.Value, r.Value.Code, r.Value.Message))]);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        return db.DeleteOrNotFoundAsync<Transaction>(
            id,
            t => t.Id == transactionId,
            NotFound,
            transaction => deletions.Record(
                TrashKind.Transaction,
                id,
                TrashLabel.Dated(transaction.Description, transaction.Date, transaction.Amount)),
            cancellationToken);
    }

    private async Task<Result<List<Transaction>>> LoadForBulkAsync(
        IReadOnlyList<Guid> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.Distinct().Select(id => new TransactionId(id)).ToList();
        var transactions = await db.Transactions.Where(t => ids.Contains(t.Id)).ToListAsync(cancellationToken);

        return transactions.Count == ids.Count
            ? transactions
            : NotFound;
    }

    private async Task<Result<(Currency Currency, decimal ReportingAmount)>> ValueAsync(
        Guid accountId,
        Currency? requested,
        Currency? existing,
        decimal amount,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var value = await valuations.ValueAsync(
            new AccountId(accountId),
            amount,
            requested,
            date,
            existing is { } inUse ? [inUse] : [],
            cancellationToken);
        return value.Map(valued => (valued.Amount.Currency, valued.ReportingAmount));
    }

    private async Task<DomainError?> ValidateInputAsync(
        ITransactionInput input,
        TransactionId? transactionId,
        CancellationToken cancellationToken) =>
        await ValidateReferencesAsync(input.AccountId, input.CategoryId, input.Type, cancellationToken)
        ?? await references.TagsExistAsync(input.TagIds ?? [], cancellationToken)
        ?? (input.Lines is { Count: > 0 } lines ? await ValidateLinesAsync(lines, input.Type, cancellationToken) : null)
        ?? await RefundOriginal.CheckAsync(db.Transactions, input.RefundOfTransactionId, transactionId, cancellationToken);

    private void AddChildren(ITransactionInput input, TransactionId transactionId, Currency currency)
    {
        if (input.Lines is { Count: > 0 } requested)
        {
            db.TransactionLines.AddRange(requested.ToLines(transactionId, currentUser.Id, currency));
        }

        db.TransactionTags.AddRange(input.TagIds.ToTransactionTags(transactionId));
    }

    private async Task<DomainError?> ValidateReferencesAsync(
        Guid accountId,
        Guid? categoryId,
        FlowType type,
        CancellationToken cancellationToken)
    {
        return await references.AccountExistsAsync(new AccountId(accountId), cancellationToken)
            ?? await ValidateCategoryAsync(categoryId, type, cancellationToken);
    }

    private async Task<DomainError?> ValidateCategoryAsync(
        Guid? categoryId,
        FlowType type,
        CancellationToken cancellationToken)
    {
        if (categoryId is not { } id)
        {
            return null;
        }

        return await references.CategoryOfTypeAsync(
            new CategoryId(id),
            type,
            "Category type does not match the transaction type.",
            cancellationToken);
    }

    private async Task<DomainError?> ValidateLinesAsync(
        IReadOnlyList<TransactionLineRequest> lines,
        FlowType type,
        CancellationToken cancellationToken)
    {
        foreach (var line in lines)
        {
            var error = await ValidateCategoryAsync(line.CategoryId, type, cancellationToken);
            if (error is not null)
            {
                return error;
            }
        }

        return null;
    }
}
