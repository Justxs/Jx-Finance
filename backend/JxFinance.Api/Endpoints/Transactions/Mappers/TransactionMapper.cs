using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.Mappers;

[RegisterService<TransactionMapper>(LifeTime.Singleton)]
public sealed class TransactionMapper : Mapper<CreateTransactionRequest, TransactionResponse, Transaction>
{
    public Transaction ToEntity(CreateTransactionRequest request, Currency currency, decimal reportingAmount)
    {
        var transaction = new Transaction { Source = TransactionSource.Manual };
        Apply(request, transaction, currency, reportingAmount);
        return transaction;
    }

    public void Apply(ITransactionInput input, Transaction transaction, Currency currency, decimal reportingAmount)
    {
        var isSplit = input.Lines is { Count: > 0 };
        transaction.AccountId = new AccountId(input.AccountId);
        transaction.CategoryId = ResolveCategoryId(input.CategoryId, isSplit);
        transaction.Type = input.Type;
        transaction.Amount = new Money(input.Amount, currency);
        transaction.ReportingAmount = reportingAmount;
        transaction.Date = input.Date;
        transaction.Description = OptionalText.Normalize(input.Description);
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
            Amount = new Money(line.Amount, currency),
            Description = OptionalText.Normalize(line.Description),
        }).ToList();

    public List<TransactionTag> ToTags(TransactionId transactionId, IReadOnlyList<Guid>? tagIds) =>
        (tagIds ?? [])
            .Distinct()
            .Select(tagId => new TransactionTag { TransactionId = transactionId, TagId = new TagId(tagId) })
            .ToList();

    public TransactionResponse FromEntity(
        Transaction transaction,
        IReadOnlyList<TransactionLine>? lines,
        IReadOnlyList<TagId>? tagIds = null) => new(
        transaction.Id.Value,
        transaction.AccountId.Value,
        transaction.CategoryId?.Value,
        transaction.Type,
        transaction.Amount.Amount,
        transaction.Date,
        transaction.Description,
        transaction.Source,
        transaction.IsSplit,
        transaction.CreatedAt,
        transaction.IsSplit
            ? (lines ?? []).Select(line => new TransactionLineResponse(
                line.Id,
                line.CategoryId?.Value,
                line.Amount.Amount,
                line.Description)).ToList()
            : null,
        transaction.Amount.Currency,
        Money.Round(transaction.ReportingAmount),
        (tagIds ?? []).Select(tagId => tagId.Value).ToList());

    private static CategoryId? ResolveCategoryId(Guid? categoryId, bool isSplit)
    {
        if (isSplit || categoryId is not { } value)
        {
            return null;
        }

        return new CategoryId(value);
    }
}
