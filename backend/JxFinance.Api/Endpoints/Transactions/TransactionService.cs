using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.UpdateTransaction;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transactions;

public sealed class TransactionService(AppDbContext db, ICurrentUser currentUser) : ITransactionService
{
    public async Task<PagedResponse<TransactionResponse>> GetPageAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(request.Page, 1);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);

        var query = Filtered(request);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var linesByTransaction = await LoadLinesAsync(items.Where(t => t.IsSplit).Select(t => t.Id), cancellationToken);

        return new PagedResponse<TransactionResponse>(
            items.Select(t => ToResponse(t, linesByTransaction.GetValueOrDefault(t.Id))).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<IReadOnlyList<TransactionResponse>> ExportAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var items = await Filtered(request)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        var linesByTransaction = await LoadLinesAsync(items.Where(t => t.IsSplit).Select(t => t.Id), cancellationToken);

        return items.Select(t => ToResponse(t, linesByTransaction.GetValueOrDefault(t.Id))).ToList();
    }

    private IQueryable<Transaction> Filtered(GetTransactionsRequest request)
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
            var search = request.Search.Trim();
            query = query.Where(t => t.Description != null && t.Description.Contains(search));
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
            return Result<TransactionResponse>.Failure(ErrorCodes.NotFound, "Transaction not found.");
        }

        var lines = transaction.IsSplit
            ? await db.TransactionLines.Where(l => l.TransactionId == transactionId).ToListAsync(cancellationToken)
            : [];

        return Result<TransactionResponse>.Success(ToResponse(transaction, lines));
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
            return Result<TransactionResponse>.Failure(ErrorCodes.Validation, referenceError);
        }

        var isSplit = request.Lines is { Count: > 0 };
        if (isSplit)
        {
            var linesError = await ValidateLinesAsync(request.Lines!, request.Type, cancellationToken);
            if (linesError is not null)
            {
                return Result<TransactionResponse>.Failure(ErrorCodes.Validation, linesError);
            }
        }

        var transaction = new Transaction
        {
            AccountId = new AccountId(request.AccountId),
            CategoryId = ResolveCategoryId(request.CategoryId, isSplit),
            Type = request.Type,
            Amount = MoneyWire.Parse(request.Amount),
            Date = request.Date,
            Description = NormalizeDescription(request.Description),
            Source = TransactionSource.Manual,
            IsSplit = isSplit,
        };

        db.Transactions.Add(transaction);

        var lines = isSplit ? BuildLines(transaction.Id, request.Lines!) : [];
        if (isSplit)
        {
            db.TransactionLines.AddRange(lines);
        }

        await db.SaveChangesAsync(cancellationToken);

        return Result<TransactionResponse>.Success(ToResponse(transaction, lines));
    }

    public async Task<Result<TransactionResponse>> UpdateAsync(
        UpdateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(request.Id);
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return Result<TransactionResponse>.Failure(ErrorCodes.NotFound, "Transaction not found.");
        }

        var referenceError = await ValidateReferencesAsync(
            request.AccountId,
            request.CategoryId,
            request.Type,
            cancellationToken);
        if (referenceError is not null)
        {
            return Result<TransactionResponse>.Failure(ErrorCodes.Validation, referenceError);
        }

        var isSplit = request.Lines is { Count: > 0 };
        if (isSplit)
        {
            var linesError = await ValidateLinesAsync(request.Lines!, request.Type, cancellationToken);
            if (linesError is not null)
            {
                return Result<TransactionResponse>.Failure(ErrorCodes.Validation, linesError);
            }
        }

        // Editing a split hard-deletes the previous line set and inserts the new one (D55) —
        // lines are part of the transaction aggregate, the one soft-delete exception.
        var existingLines = await db.TransactionLines
            .Where(l => l.TransactionId == transactionId)
            .ToListAsync(cancellationToken);
        if (existingLines.Count > 0)
        {
            db.TransactionLines.RemoveRange(existingLines);
        }

        transaction.AccountId = new AccountId(request.AccountId);
        transaction.CategoryId = ResolveCategoryId(request.CategoryId, isSplit);
        transaction.Type = request.Type;
        transaction.Amount = MoneyWire.Parse(request.Amount);
        transaction.Date = request.Date;
        transaction.Description = NormalizeDescription(request.Description);
        transaction.IsSplit = isSplit;

        var lines = isSplit ? BuildLines(transactionId, request.Lines!) : [];
        if (isSplit)
        {
            db.TransactionLines.AddRange(lines);
        }

        await db.SaveChangesAsync(cancellationToken);

        return Result<TransactionResponse>.Success(ToResponse(transaction, lines));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Transaction not found.");
        }

        var lines = await db.TransactionLines.Where(l => l.TransactionId == transactionId).ToListAsync(cancellationToken);
        if (lines.Count > 0)
        {
            db.TransactionLines.RemoveRange(lines);
        }

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private async Task<string?> ValidateReferencesAsync(
        Guid accountId,
        Guid? categoryId,
        FlowType type,
        CancellationToken cancellationToken)
    {
        var typedAccountId = new AccountId(accountId);
        var accountExists = await db.Accounts.AnyAsync(a => a.Id == typedAccountId, cancellationToken);
        if (!accountExists)
        {
            return "Account does not exist.";
        }

        return await ValidateCategoryAsync(categoryId, type, cancellationToken);
    }

    private async Task<string?> ValidateCategoryAsync(
        Guid? categoryId,
        FlowType type,
        CancellationToken cancellationToken)
    {
        if (categoryId is not { } id)
        {
            return null;
        }

        var typedCategoryId = new CategoryId(id);
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == typedCategoryId, cancellationToken);
        if (category is null)
        {
            return "Category does not exist.";
        }

        return category.Type != type ? "Category type does not match the transaction type." : null;
    }

    private async Task<string?> ValidateLinesAsync(
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

    private List<TransactionLine> BuildLines(TransactionId transactionId, IReadOnlyList<TransactionLineRequest> lines) =>
        lines.Select(line => new TransactionLine
        {
            UserId = currentUser.Id,
            TransactionId = transactionId,
            CategoryId = line.CategoryId is { } categoryId ? new CategoryId(categoryId) : null,
            Amount = MoneyWire.Parse(line.Amount),
            Description = NormalizeDescription(line.Description),
        }).ToList();

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

    private static CategoryId? ResolveCategoryId(Guid? categoryId, bool isSplit)
    {
        if (isSplit || categoryId is not { } value)
        {
            return null;
        }

        return new CategoryId(value);
    }

    private static string? NormalizeDescription(string? description)
    {
        var trimmed = description?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static TransactionResponse ToResponse(Transaction transaction, IReadOnlyList<TransactionLine>? lines) => new(
        transaction.Id.Value,
        transaction.AccountId.Value,
        transaction.CategoryId?.Value,
        transaction.Type,
        MoneyWire.ToWire(transaction.Amount),
        transaction.Date,
        transaction.Description,
        transaction.Source,
        transaction.IsSplit,
        transaction.CreatedAt,
        transaction.IsSplit
            ? (lines ?? []).Select(l => new TransactionLineResponse(
                l.Id,
                l.CategoryId?.Value,
                MoneyWire.ToWire(l.Amount),
                l.Description)).ToList()
            : null);
}
