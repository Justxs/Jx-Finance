using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;

namespace JxFinance.Endpoints.Transactions.Mappers;

[RegisterService<TransactionMapper>(LifeTime.Singleton)]
public sealed class TransactionMapper : Mapper<CreateTransactionRequest, TransactionResponse, Transaction>
{
    public Transaction ToEntity(CreateTransactionRequest request, Currency currency, decimal reportingAmount)
    {
        var isSplit = request.Lines is { Count: > 0 };
        return new Transaction
        {
            AccountId = new AccountId(request.AccountId),
            CategoryId = ResolveCategoryId(request.CategoryId, isSplit),
            Type = request.Type,
            Amount = MoneyWire.Parse(request.Amount, currency),
            ReportingAmount = reportingAmount,
            Date = request.Date,
            Description = OptionalText.Normalize(request.Description),
            Source = TransactionSource.Manual,
            IsSplit = isSplit,
        };
    }

    public void UpdateEntity(UpdateTransactionRequest request, Transaction transaction, Currency currency, decimal reportingAmount)
    {
        var isSplit = request.Lines is { Count: > 0 };
        transaction.AccountId = new AccountId(request.AccountId);
        transaction.CategoryId = ResolveCategoryId(request.CategoryId, isSplit);
        transaction.Type = request.Type;
        transaction.Amount = MoneyWire.Parse(request.Amount, currency);
        transaction.ReportingAmount = reportingAmount;
        transaction.Date = request.Date;
        transaction.Description = OptionalText.Normalize(request.Description);
        transaction.IsSplit = isSplit;
    }

    public List<TransactionLine> ToLines(
        TransactionId transactionId,
        Guid userId,
        IReadOnlyList<TransactionLineRequest> lines,
        Currency currency) =>
        lines.Select(line => new TransactionLine
        {
            UserId = userId,
            TransactionId = transactionId,
            CategoryId = line.CategoryId is { } categoryId ? new CategoryId(categoryId) : null,
            Amount = MoneyWire.Parse(line.Amount, currency),
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
            : null,
        transaction.Amount.Currency,
        MoneyWire.ToWire(new Money(transaction.ReportingAmount)));

    private static CategoryId? ResolveCategoryId(Guid? categoryId, bool isSplit)
    {
        if (isSplit || categoryId is not { } value)
        {
            return null;
        }

        return new CategoryId(value);
    }
}
