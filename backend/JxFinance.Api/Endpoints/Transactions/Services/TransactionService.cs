using System.Runtime.CompilerServices;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;
using JxFinance.Endpoints.Transactions.BulkTagTransactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.GetTransactionsSummary;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Transactions.Services;

[RegisterService<ITransactionService>(LifeTime.Scoped)]
public sealed class TransactionService(
    AppDbContext db,
    ICurrentUser currentUser,
    ITransactionValuation valuations,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IOptions<AppOptions> options) : ITransactionService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Transaction not found.");

    public async Task<PagedResponse<TransactionResponse>> GetPageAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var page = await Filtered(request)
            .AsNoTracking()
            .ToPageAsync(request, query => Sorted(query, request), cancellationToken);

        var linesByTransaction = await LoadLinesAsync(page.Items.Where(t => t.IsSplit).Select(t => t.Id), cancellationToken);
        var tagsByTransaction = await LoadTagsAsync(page.Items.Select(t => t.Id), cancellationToken);
        var attachmentCounts = await CountAttachmentsAsync(page.Items.Select(t => t.Id), cancellationToken);

        return page.Map(t => t.ToResponse(
            linesByTransaction.GetValueOrDefault(t.Id),
            tagsByTransaction.GetValueOrDefault(t.Id),
            attachmentCounts.GetValueOrDefault(t.Id)));
    }

    public async IAsyncEnumerable<TransactionResponse> StreamExportAsync(
        GetTransactionsRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var tagsByTransaction = await LoadTagsOfFilteredAsync(request, cancellationToken);

        var rows = Sorted(Filtered(request), request)
            .AsNoTracking()
            .AsAsyncEnumerable()
            .WithCancellation(cancellationToken);

        await foreach (var transaction in rows)
        {
            yield return transaction.ToResponse(null, tagsByTransaction.GetValueOrDefault(transaction.Id));
        }
    }

    public async Task<Result<IReadOnlyList<TransactionResponse>>> ExportForPdfAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var limit = options.Value.PdfExportMaxRows;
        var items = await Sorted(Filtered(request), request)
            .AsNoTracking()
            .Take(limit + 1)
            .ToListAsync(cancellationToken);
        if (items.Count > limit)
        {
            return new DomainError(
                ErrorCodes.ExportTooManyRows,
                $"A PDF holds at most {limit} transactions. Narrow the filters, or export CSV instead.");
        }

        var tagsByTransaction = await LoadTagsAsync(items.Select(t => t.Id), cancellationToken);

        return items.Select(t => t.ToResponse(null, tagsByTransaction.GetValueOrDefault(t.Id))).ToList();
    }

    public async Task<TransactionsSummaryResponse> GetSummaryAsync(
        GetTransactionsSummaryRequest request,
        CancellationToken cancellationToken)
    {
        var totals = await Filtered(request)
            .GroupBy(t => 1)
            .Select(g => new
            {
                Count = g.Count(),
                Income = g.Sum(t => t.Type == FlowType.Income ? t.ReportingAmount : 0m),
                Expense = g.Sum(t => t.Type == FlowType.Expense ? t.ReportingAmount : 0m),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new TransactionsSummaryResponse(
            totals?.Count ?? 0,
            totals?.Income ?? 0m,
            totals?.Expense ?? 0m);
    }

    private IOrderedQueryable<Transaction> Sorted(IQueryable<Transaction> query, GetTransactionsRequest request)
    {
        var descending = (request.Direction ?? SortDirection.Desc) == SortDirection.Desc;

        return (request.Sort ?? TransactionSortField.Date) switch
        {
            TransactionSortField.Description => Order(query, t => t.Description, descending),
            TransactionSortField.Category => Order(
                query,
                t => db.Categories.Where(c => c.Id == t.CategoryId).Select(c => c.Name).FirstOrDefault(),
                descending),
            TransactionSortField.Account => Order(
                query,
                t => db.Accounts.Where(a => a.Id == t.AccountId).Select(a => a.Name).FirstOrDefault(),
                descending),
            TransactionSortField.Amount => Order(query, t => t.ReportingAmount, descending),
            _ => descending
                ? query.OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAt)
                : query.OrderBy(t => t.Date).ThenBy(t => t.CreatedAt),
        };
    }

    private static IOrderedQueryable<Transaction> Order<TKey>(
        IQueryable<Transaction> query,
        System.Linq.Expressions.Expression<Func<Transaction, TKey>> key,
        bool descending) =>
        descending
            ? query.OrderByDescending(key).ThenByDescending(t => t.CreatedAt)
            : query.OrderBy(key).ThenByDescending(t => t.CreatedAt);

    private IQueryable<Transaction> Filtered(ITransactionFilter request)
    {
        var query = db.Transactions.AsQueryable();
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(t => t.AccountId == typedAccountId);
        }

        if (request.CategoryId is { } categoryId)
        {
            var typedCategoryId = new CategoryId(categoryId);
            query = query.Where(t => t.CategoryId == typedCategoryId ||
                (t.IsSplit && db.TransactionLines.Any(l => l.TransactionId == t.Id && l.CategoryId == typedCategoryId)));
        }

        foreach (var tagId in GuidList.Parse(request.TagIds))
        {
            var typedTagId = new TagId(tagId);
            query = query.Where(t => db.TransactionTags.Any(x => x.TransactionId == t.Id && x.TagId == typedTagId));
        }

        if (request.Type is { } type)
        {
            query = query.Where(t => t.Type == type);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var pattern = LikePattern.Contains(request.Search);
            query = query.Where(t => t.Description != null && EF.Functions.ILike(t.Description, pattern, LikePattern.Escape));
        }

        if (request.DateFrom is { } dateFrom)
        {
            query = query.Where(t => t.Date >= dateFrom);
        }

        if (request.DateTo is { } dateTo)
        {
            query = query.Where(t => t.Date <= dateTo);
        }

        return query;
    }

    public async Task<Result<TransactionResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        if (await FindAsync(transactionId, cancellationToken) is not { } transaction)
        {
            return NotFound;
        }

        var lines = transaction.IsSplit
            ? await db.TransactionLines.Where(l => l.TransactionId == transactionId).ToListAsync(cancellationToken)
            : [];
        var tagIds = await TagIdsOfAsync(transactionId, cancellationToken);
        var attachmentCount = await db.TransactionAttachments.CountAsync(a => a.TransactionId == transactionId, cancellationToken);

        return transaction.ToResponse(lines, tagIds, attachmentCount);
    }

    public async Task<Result<TransactionResponse>> CreateAsync(
        CreateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        if (await ValidateInputAsync(request, cancellationToken) is { } inputError)
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

        db.Transactions.Add(transaction);
        var (lines, tagIds) = AddChildren(request, transaction.Id, currency);
        await db.SaveChangesAsync(cancellationToken);

        return transaction.ToResponse(lines, tagIds);
    }

    public async Task<Result<TransactionResponse>> UpdateAsync(
        UpdateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(request.Id);
        if (await FindAsync(transactionId, cancellationToken) is not { } transaction)
        {
            return NotFound;
        }

        if (await ValidateInputAsync(request, cancellationToken) is { } inputError)
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
        var (lines, tagIds) = AddChildren(request, transactionId, currency);

        await db.SaveChangesAsync(cancellationToken);
        var attachmentCount = await db.TransactionAttachments.CountAsync(a => a.TransactionId == transactionId, cancellationToken);

        return transaction.ToResponse(lines, tagIds, attachmentCount);
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
        foreach (var transaction in transactions)
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
                (transactions.Count, "transaction", "transactions")),
            transactions.Count,
            accounts: transactions.Select(t => t.AccountId));
        await db.SaveChangesAsync(cancellationToken);

        return transactions.Count;
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

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        return db.DeleteOrNotFoundAsync<Transaction>(
            id,
            t => t.Id == transactionId,
            NotFound.Message,
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

    private Task<Transaction?> FindAsync(TransactionId id, CancellationToken cancellationToken) =>
        db.Transactions.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

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

    private async Task<DomainError?> ValidateInputAsync(ITransactionInput input, CancellationToken cancellationToken) =>
        await ValidateReferencesAsync(input.AccountId, input.CategoryId, input.Type, cancellationToken)
        ?? await references.TagsExistAsync(input.TagIds ?? [], cancellationToken)
        ?? (input.Lines is { Count: > 0 } lines ? await ValidateLinesAsync(lines, input.Type, cancellationToken) : null);

    private (List<TransactionLine> Lines, List<TagId> TagIds) AddChildren(
        ITransactionInput input,
        TransactionId transactionId,
        Currency currency)
    {
        var lines = input.Lines is { Count: > 0 } requested ? requested.ToLines(transactionId, currentUser.Id, currency) : [];
        var tags = input.TagIds.ToTransactionTags(transactionId);
        db.TransactionLines.AddRange(lines);
        db.TransactionTags.AddRange(tags);

        return (lines, tags.Select(tag => tag.TagId).ToList());
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

    private async Task<Dictionary<TransactionId, List<TransactionLine>>> LoadLinesAsync(
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var lines = await db.TransactionLines.Where(l => ids.Contains(l.TransactionId)).ToListAsync(cancellationToken);
        return lines.GroupBy(l => l.TransactionId).ToDictionary(g => g.Key, g => g.ToList());
    }

    private async Task<Dictionary<TransactionId, List<TagId>>> LoadTagsAsync(
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var pairs = await db.TransactionTags
            .Where(x => ids.Contains(x.TransactionId))
            .Select(x => new { x.TransactionId, x.TagId })
            .ToListAsync(cancellationToken);

        return Group(pairs.Select(pair => (pair.TransactionId, pair.TagId)));
    }

    private async Task<Dictionary<TransactionId, int>> CountAttachmentsAsync(
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return await db.TransactionAttachments
            .Where(a => ids.Contains(a.TransactionId))
            .GroupBy(a => a.TransactionId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken);
    }

    private async Task<Dictionary<TransactionId, List<TagId>>> LoadTagsOfFilteredAsync(
        ITransactionFilter request,
        CancellationToken cancellationToken)
    {
        var matching = Filtered(request);
        var pairs = await db.TransactionTags
            .Where(x => matching.Any(t => t.Id == x.TransactionId))
            .Select(x => new { x.TransactionId, x.TagId })
            .ToListAsync(cancellationToken);

        return Group(pairs.Select(pair => (pair.TransactionId, pair.TagId)));
    }

    private async Task<List<TagId>> TagIdsOfAsync(TransactionId transactionId, CancellationToken cancellationToken) =>
        await db.TransactionTags
            .Where(x => x.TransactionId == transactionId)
            .Select(x => x.TagId)
            .ToListAsync(cancellationToken);

    private static Dictionary<TransactionId, List<TagId>> Group(IEnumerable<(TransactionId TransactionId, TagId TagId)> pairs) =>
        pairs
            .GroupBy(pair => pair.TransactionId)
            .ToDictionary(group => group.Key, group => group.Select(pair => pair.TagId).ToList());
}
