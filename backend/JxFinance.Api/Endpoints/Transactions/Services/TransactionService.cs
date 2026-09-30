using System.Runtime.CompilerServices;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Payees;
using JxFinance.Common.References;
using JxFinance.Common.Refunds;
using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Households.Shared;
using JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;
using JxFinance.Endpoints.Transactions.BulkTagTransactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.ExportTransactions;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.GetTransactionsSummary;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;
using JxFinance.Infrastructure.Auth;
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
    IInstanceSettingsStore settings,
    IClock clock,
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

        return page.Map(await ResponderAsync(page.Items, cancellationToken));
    }

    public async Task<ExportNames> ExportNamesAsync(CancellationToken cancellationToken) => new(
        await db.Accounts.Select(a => new { a.Id, a.Name }).ToDictionaryAsync(a => a.Id.Value, a => a.Name, cancellationToken),
        await db.Categories.Select(c => new { c.Id, c.Name }).ToDictionaryAsync(c => c.Id.Value, c => c.Name, cancellationToken),
        await db.Tags.Select(t => new { t.Id, t.Name }).ToDictionaryAsync(t => t.Id.Value, t => t.Name, cancellationToken));

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
            .SingleOrDefaultAsync(cancellationToken);

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

    private IQueryable<Transaction> Filtered(TransactionFilterRequest request)
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
            query = query.Where(t => t.CategoryId == typedCategoryId
                || db.Categories.Any(c => c.Id == t.CategoryId && c.ParentId == typedCategoryId)
                || (t.IsSplit && db.TransactionLines.Any(l => l.TransactionId == t.Id
                    && (l.CategoryId == typedCategoryId
                        || db.Categories.Any(c => c.Id == l.CategoryId && c.ParentId == typedCategoryId)))));
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
            query = query.Where(t =>
                (t.Description != null && EF.Functions.ILike(t.Description, pattern, LikePattern.Escape))
                || (t.Note != null && EF.Functions.ILike(t.Note, pattern, LikePattern.Escape))
                || db.PayeeNames.Any(p => p.PayeeKey == t.PayeeKey && EF.Functions.ILike(p.Name, pattern, LikePattern.Escape)));
        }

        if (SubscriptionDescription.Normalize(request.Payee) is { Length: > 0 } payeeKey)
        {
            query = query.Where(t => t.PayeeKey == payeeKey);
        }

        if (request is { SpreadOverlap: true, DateFrom: { } from, DateTo: { } to })
        {
            query = query.Where(t => (t.Date >= from && t.Date <= to)
                || (t.SpreadMonths != null && t.Date <= to && t.SpreadUntil >= from));
        }
        else
        {
            if (request.DateFrom is { } dateFrom)
            {
                query = query.Where(t => t.Date >= dateFrom);
            }

            if (request.DateTo is { } dateTo)
            {
                query = query.Where(t => t.Date <= dateTo);
            }
        }

        if (request.AmountMin is { } amountMin)
        {
            query = query.Where(t => Math.Abs(t.Amount.Amount) >= amountMin);
        }

        if (request.AmountMax is { } amountMax)
        {
            query = query.Where(t => Math.Abs(t.Amount.Amount) <= amountMax);
        }

        if (request.Unusual == true && UnusualEnabled)
        {
            query = query.Where(t => t.Unusual != null && t.UnusualDismissedAt == null);
        }

        if (request.Uncategorized == true)
        {
            query = query.Where(t => t.IsSplit
                ? db.TransactionLines.Any(l => l.TransactionId == t.Id && l.CategoryId == null)
                : t.CategoryId == null);
        }

        return query;
    }

    private bool UnusualEnabled => settings.Current.IsEnabled(Feature.UnusualAmounts);

    private TransactionResponse Shown(TransactionResponse response) =>
        UnusualEnabled ? response : response.WithoutUnusual();

    public async Task<Result<TransactionResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        if (await FindAsync(transactionId, cancellationToken) is not { } transaction)
        {
            return NotFound;
        }

        return await ResponseAsync(transaction, cancellationToken);
    }

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

        db.Transactions.Add(transaction);
        AddChildren(request, transaction.Id, currency);
        await db.SaveChangesAsync(cancellationToken);

        return await ResponseAsync(transaction, cancellationToken);
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
        AddChildren(request, transactionId, currency);

        await db.SaveChangesAsync(cancellationToken);

        return await ResponseAsync(transaction, cancellationToken);
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

    private async Task<TransactionResponse> ResponseAsync(Transaction transaction, CancellationToken cancellationToken) =>
        (await ResponderAsync([transaction], cancellationToken))(transaction);

    private async Task<Func<Transaction, TransactionResponse>> ResponderAsync(
        IReadOnlyList<Transaction> transactions,
        CancellationToken cancellationToken)
    {
        var ids = transactions.Select(t => t.Id).ToList();
        var linesByTransaction = await LoadLinesAsync(transactions.Where(t => t.IsSplit).Select(t => t.Id), cancellationToken);
        var tagsByTransaction = await LoadTagsAsync(ids, cancellationToken);
        var attachmentCounts = await CountAttachmentsAsync(ids, cancellationToken);
        var debtPayments = await DebtPaymentsOfAsync(ids, cancellationToken);
        var refunds = await RefundMarksAsync(transactions, cancellationToken);
        var splits = await SharedExpensesOfAsync(transactions, cancellationToken);
        var payeeNames = await db.PayeeNamesForAsync(transactions.Select(t => t.PayeeKey), cancellationToken);

        return t => Shown(refunds.Apply(t, t.ToResponse(
            linesByTransaction.GetValueOrDefault(t.Id),
            tagsByTransaction.GetValueOrDefault(t.Id),
            attachmentCounts.GetValueOrDefault(t.Id)) with
        {
            DebtPayment = debtPayments.GetValueOrDefault(t.Id),
            SharedExpense = splits.GetValueOrDefault(t.Id),
            PayeeName = t.PayeeKey is { } key ? payeeNames.GetValueOrDefault(key) : null,
        }));
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

    private async Task<Dictionary<TransactionId, TransactionDebtPaymentResponse>> DebtPaymentsOfAsync(
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.NetWorth))
        {
            return [];
        }

        var ids = transactionIds.ToList();
        return await db.DebtPayments
            .Where(p => ids.Contains(p.TransactionId))
            .Join(db.Debts, p => p.DebtId, d => d.Id, (p, d) => new { p.TransactionId, Marker = new TransactionDebtPaymentResponse(p.Id.Value, d.Id.Value, d.Name) })
            .ToDictionaryAsync(x => x.TransactionId, x => x.Marker, cancellationToken);
    }

    private async Task<Dictionary<TransactionId, TransactionSharedExpenseResponse>> SharedExpensesOfAsync(
        IReadOnlyCollection<Transaction> transactions,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.Households))
        {
            return [];
        }

        var ids = transactions.Select(t => t.Id).ToList();
        var payerId = currentUser.Id;
        var splits = await db.SharedExpenses
            .Where(e => ids.Contains(e.TransactionId) && e.UserId == payerId)
            .Join(db.Households, e => e.HouseholdId, h => h.Id, (e, h) => new
            {
                e.Id,
                e.TransactionId,
                e.Amount,
                e.Method,
                HouseholdId = h.Id,
                HouseholdName = h.Name,
            })
            .ToListAsync(cancellationToken);
        var splitIds = splits.Select(s => s.Id).ToList();
        var shares = (await db.SharedExpenseShares
                .Where(s => splitIds.Contains(s.SharedExpenseId))
                .Join(db.Users, s => s.UserId, u => u.Id, (s, u) => new { s.SharedExpenseId, s.UserId, s.Weight, s.Amount, u.DisplayName, u.Email })
                .ToListAsync(cancellationToken))
            .ToLookup(
                s => s.SharedExpenseId,
                s => new ShareResponse(s.UserId, AppUser.DisplayNameOrEmail(s.DisplayName, s.Email), s.Weight, s.Amount));
        var amounts = transactions.ToDictionary(t => t.Id, t => t.Amount);

        return splits.ToDictionary(
            s => s.TransactionId,
            s => new TransactionSharedExpenseResponse(
                s.Id.Value,
                s.HouseholdId.Value,
                s.HouseholdName,
                s.Method,
                [.. shares[s.Id].OrderBy(share => share.Name, StringComparer.CurrentCultureIgnoreCase)],
                shares[s.Id].FirstOrDefault(share => share.UserId == payerId)?.Amount ?? 0m,
                s.Amount != amounts[s.TransactionId]));
    }

    private async Task<RefundMarks> RefundMarksAsync(
        IReadOnlyCollection<Transaction> transactions,
        CancellationToken cancellationToken)
    {
        var originalIds = transactions.Select(t => t.RefundOfTransactionId).OfType<TransactionId>().Distinct().ToList();
        var originals = originalIds.Count == 0
            ? []
            : await db.Transactions
                .Where(t => originalIds.Contains(t.Id))
                .Select(t => new { t.Id, t.Date, t.Description })
                .ToDictionaryAsync(t => t.Id, t => new TransactionRefundOfResponse(t.Id.Value, t.Date, t.Description), cancellationToken);

        var purchaseIds = transactions
            .Where(t => t.Type == FlowType.Expense && t.Amount.Amount > 0)
            .Select(t => (TransactionId?)t.Id)
            .ToList();
        var refunded = purchaseIds.Count == 0
            ? []
            : await db.Transactions
                .Where(t => purchaseIds.Contains(t.RefundOfTransactionId))
                .GroupBy(t => t.RefundOfTransactionId)
                .Select(g => new { g.Key, Total = g.Sum(t => t.ReportingAmount) })
                .ToDictionaryAsync(g => g.Key!.Value, g => Money.Round(-g.Total), cancellationToken);

        return new RefundMarks(originals, refunded);
    }

    private sealed record RefundMarks(
        Dictionary<TransactionId, TransactionRefundOfResponse> Originals,
        Dictionary<TransactionId, decimal> Refunded)
    {
        public TransactionResponse Apply(Transaction transaction, TransactionResponse response) => response with
        {
            RefundOf = transaction.RefundOfTransactionId is { } id ? Originals.GetValueOrDefault(id) : null,
            RefundedAmount = Refunded.TryGetValue(transaction.Id, out var total) ? total : null,
        };
    }

    private async Task<Dictionary<TransactionId, List<TagId>>> LoadTagsOfFilteredAsync(
        TransactionFilterRequest request,
        CancellationToken cancellationToken)
    {
        var matching = Filtered(request);
        var pairs = await db.TransactionTags
            .Where(x => matching.Any(t => t.Id == x.TransactionId))
            .Select(x => new { x.TransactionId, x.TagId })
            .ToListAsync(cancellationToken);

        return Group(pairs.Select(pair => (pair.TransactionId, pair.TagId)));
    }

    private static Dictionary<TransactionId, List<TagId>> Group(IEnumerable<(TransactionId TransactionId, TagId TagId)> pairs) =>
        pairs
            .GroupBy(pair => pair.TransactionId)
            .ToDictionary(group => group.Key, group => group.Select(pair => pair.TagId).ToList());
}
