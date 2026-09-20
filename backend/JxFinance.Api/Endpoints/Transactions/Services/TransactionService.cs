using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;
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
    TransactionMapper mapper,
    IExchangeRateService rates,
    IReferenceGuard references,
    IOptions<AppOptions> options) : ITransactionService
{
    public async Task<PagedResponse<TransactionResponse>> GetPageAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var page = await Filtered(request).ToPageAsync(request, query => Sorted(query, request), cancellationToken);

        var linesByTransaction = await LoadLinesAsync(page.Items.Where(t => t.IsSplit).Select(t => t.Id), cancellationToken);

        return page.Map(t => mapper.FromEntity(t, linesByTransaction.GetValueOrDefault(t.Id)));
    }

    public IAsyncEnumerable<TransactionResponse> StreamExportAsync(GetTransactionsRequest request) =>
        Sorted(Filtered(request), request)
            .AsNoTracking()
            .AsAsyncEnumerable()
            .Select(t => mapper.FromEntity(t, null));

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

        return items.Select(t => mapper.FromEntity(t, null)).ToList();
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
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Transaction not found.");
        }

        var lines = transaction.IsSplit
            ? await db.TransactionLines.Where(l => l.TransactionId == transactionId).ToListAsync(cancellationToken)
            : [];

        return mapper.FromEntity(transaction, lines);
    }

    public async Task<Result<TransactionResponse>> CreateAsync(
        CreateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var referenceError = await ValidateReferencesAsync(
            request.AccountId,
            request.CategoryId,
            request.Type,
            cancellationToken);
        if (referenceError is not null)
        {
            return referenceError;
        }

        var isSplit = request.Lines is { Count: > 0 };
        if (isSplit)
        {
            var linesError = await ValidateLinesAsync(request.Lines!, request.Type, cancellationToken);
            if (linesError is not null)
            {
                return linesError;
            }
        }

        var valuation = await ValueAsync(request.AccountId, request.Currency, null, request.Amount, request.Date, cancellationToken);
        if (valuation.IsFailure)
        {
            return valuation.Error;
        }

        var (currency, reportingAmount) = valuation.Value;
        var transaction = mapper.ToEntity(request, currency, reportingAmount);

        db.Transactions.Add(transaction);

        var lines = isSplit ? mapper.ToLines(transaction.Id, currentUser.Id, request.Lines!, currency) : [];
        if (isSplit)
        {
            db.TransactionLines.AddRange(lines);
        }

        await db.SaveChangesAsync(cancellationToken);

        return mapper.FromEntity(transaction, lines);
    }

    public async Task<Result<TransactionResponse>> UpdateAsync(
        UpdateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(request.Id);
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Transaction not found.");
        }

        var referenceError = await ValidateReferencesAsync(
            request.AccountId,
            request.CategoryId,
            request.Type,
            cancellationToken);
        if (referenceError is not null)
        {
            return referenceError;
        }

        var isSplit = request.Lines is { Count: > 0 };
        if (isSplit)
        {
            var linesError = await ValidateLinesAsync(request.Lines!, request.Type, cancellationToken);
            if (linesError is not null)
            {
                return linesError;
            }
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

        var existingLines = await db.TransactionLines
            .Where(l => l.TransactionId == transactionId)
            .ToListAsync(cancellationToken);
        if (existingLines.Count > 0)
        {
            db.TransactionLines.RemoveRange(existingLines);
        }

        mapper.Apply(request, transaction, currency, reportingAmount);

        var lines = isSplit ? mapper.ToLines(transactionId, currentUser.Id, request.Lines!, currency) : [];
        if (isSplit)
        {
            db.TransactionLines.AddRange(lines);
        }

        await db.SaveChangesAsync(cancellationToken);

        return mapper.FromEntity(transaction, lines);
    }

    public async Task<Result<int>> BulkCategorizeAsync(
        BulkCategorizeTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var ids = request.TransactionIds.Distinct().Select(id => new TransactionId(id)).ToList();
        var transactions = await db.Transactions.Where(t => ids.Contains(t.Id)).ToListAsync(cancellationToken);
        if (transactions.Count != ids.Count)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Transaction not found.");
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

        await db.SaveChangesAsync(cancellationToken);

        return transactions.Count;
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Transaction not found.");
        }

        var lines = await db.TransactionLines.Where(l => l.TransactionId == transactionId).ToListAsync(cancellationToken);
        if (lines.Count > 0)
        {
            db.TransactionLines.RemoveRange(lines);
        }

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    private async Task<Result<(Currency Currency, decimal ReportingAmount)>> ValueAsync(
        Guid accountId,
        Currency? requested,
        Currency? existing,
        decimal amount,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var typedAccountId = new AccountId(accountId);
        var currency = requested ?? await db.Accounts
            .Where(a => a.Id == typedAccountId)
            .Select(a => a.StartingBalance.Currency)
            .FirstAsync(cancellationToken);

        if (currency != existing && rates.UnusableReason(currency) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var reporting = await rates.ToReportingAsync(new Money(amount, currency), date, cancellationToken);
        return reporting.IsSuccess
            ? (currency, reporting.Value)
            : reporting.Error;
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
}
