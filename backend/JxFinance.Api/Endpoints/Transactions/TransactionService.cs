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

public sealed class TransactionService(AppDbContext db) : ITransactionService
{
    public async Task<PagedResponse<TransactionResponse>> GetPageAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(request.Page, 1);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);

        var query = db.Transactions.AsQueryable();
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(t => t.AccountId == typedAccountId);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<TransactionResponse>(
            items.Select(ToResponse).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<Result<TransactionResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        return transaction is null
            ? Result<TransactionResponse>.Failure(ErrorCodes.NotFound, "Transaction not found.")
            : Result<TransactionResponse>.Success(ToResponse(transaction));
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

        var transaction = new Transaction
        {
            AccountId = new AccountId(request.AccountId),
            CategoryId = request.CategoryId is { } categoryId ? new CategoryId(categoryId) : null,
            Type = request.Type,
            Amount = MoneyWire.Parse(request.Amount),
            Date = request.Date,
            Description = NormalizeDescription(request.Description),
            Source = TransactionSource.Manual,
        };

        db.Transactions.Add(transaction);
        await db.SaveChangesAsync(cancellationToken);

        return Result<TransactionResponse>.Success(ToResponse(transaction));
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

        transaction.AccountId = new AccountId(request.AccountId);
        transaction.CategoryId = request.CategoryId is { } categoryId ? new CategoryId(categoryId) : null;
        transaction.Type = request.Type;
        transaction.Amount = MoneyWire.Parse(request.Amount);
        transaction.Date = request.Date;
        transaction.Description = NormalizeDescription(request.Description);
        await db.SaveChangesAsync(cancellationToken);

        return Result<TransactionResponse>.Success(ToResponse(transaction));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Transaction not found.");
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

        if (categoryId is { } id)
        {
            var typedCategoryId = new CategoryId(id);
            var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == typedCategoryId, cancellationToken);
            if (category is null)
            {
                return "Category does not exist.";
            }

            if (category.Type != type)
            {
                return "Category type does not match the transaction type.";
            }
        }

        return null;
    }

    private static string? NormalizeDescription(string? description)
    {
        var trimmed = description?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static TransactionResponse ToResponse(Transaction transaction) => new(
        transaction.Id.Value,
        transaction.AccountId.Value,
        transaction.CategoryId?.Value,
        transaction.Type,
        MoneyWire.ToWire(transaction.Amount),
        transaction.Date,
        transaction.Description,
        transaction.Source,
        transaction.IsSplit,
        transaction.CreatedAt);
}
