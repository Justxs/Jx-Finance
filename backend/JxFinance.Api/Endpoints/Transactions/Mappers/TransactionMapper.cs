using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;

namespace JxFinance.Endpoints.Transactions.Mappers;

public sealed class TransactionMapper : Mapper<CreateTransactionRequest, TransactionResponse, Transaction>
{
    public override Transaction ToEntity(CreateTransactionRequest request)
    {
        var isSplit = request.Lines is { Count: > 0 };
        return new Transaction
        {
            AccountId = new AccountId(request.AccountId),
            CategoryId = ResolveCategoryId(request.CategoryId, isSplit),
            Type = request.Type,
            Amount = MoneyWire.Parse(request.Amount),
            Date = request.Date,
            Description = OptionalText.Normalize(request.Description),
            Source = TransactionSource.Manual,
            IsSplit = isSplit,
        };
    }

    public void UpdateEntity(UpdateTransactionRequest request, Transaction transaction)
    {
        var isSplit = request.Lines is { Count: > 0 };
        transaction.AccountId = new AccountId(request.AccountId);
        transaction.CategoryId = ResolveCategoryId(request.CategoryId, isSplit);
        transaction.Type = request.Type;
        transaction.Amount = MoneyWire.Parse(request.Amount);
        transaction.Date = request.Date;
        transaction.Description = OptionalText.Normalize(request.Description);
        transaction.IsSplit = isSplit;
    }

    public List<TransactionLine> ToLines(
        TransactionId transactionId,
        Guid userId,
        IReadOnlyList<TransactionLineRequest> lines) =>
        lines.Select(line => new TransactionLine
        {
            UserId = userId,
            TransactionId = transactionId,
            CategoryId = line.CategoryId is { } categoryId ? new CategoryId(categoryId) : null,
            Amount = MoneyWire.Parse(line.Amount),
            Description = OptionalText.Normalize(line.Description),
        }).ToList();

    public TransactionResponse FromEntity(Transaction transaction, IReadOnlyList<TransactionLine>? lines) => new(
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
            ? (lines ?? []).Select(line => new TransactionLineResponse(
                line.Id,
                line.CategoryId?.Value,
                MoneyWire.ToWire(line.Amount),
                line.Description)).ToList()
            : null);

    private static CategoryId? ResolveCategoryId(Guid? categoryId, bool isSplit)
    {
        if (isSplit || categoryId is not { } value)
        {
            return null;
        }

        return new CategoryId(value);
    }
}
