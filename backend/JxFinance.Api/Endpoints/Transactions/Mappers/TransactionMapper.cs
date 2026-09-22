using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.Mappers;

public static class TransactionMapper
{
    public static Transaction ToEntity(this CreateTransactionRequest request, Currency currency, decimal reportingAmount)
    {
        var transaction = new Transaction { Source = TransactionSource.Manual };
        request.ApplyTo(transaction, currency, reportingAmount);
        return transaction;
    }

    public static void ApplyTo(this ITransactionInput input, Transaction transaction, Currency currency, decimal reportingAmount)
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

    public static List<TransactionLine> ToLines(
        this IReadOnlyList<TransactionLineRequest> lines,
        TransactionId transactionId,
        Guid userId,
        Currency currency) =>
        lines.Select(line => new TransactionLine
        {
            UserId = userId,
            TransactionId = transactionId,
            CategoryId = line.CategoryId is { } categoryId ? new CategoryId(categoryId) : null,
            Amount = new Money(line.Amount, currency),
            Description = OptionalText.Normalize(line.Description),
        }).ToList();

    public static List<TransactionTag> ToTransactionTags(this IReadOnlyList<Guid>? tagIds, TransactionId transactionId) =>
        (tagIds ?? [])
            .Distinct()
            .Select(tagId => new TransactionTag { TransactionId = transactionId, TagId = new TagId(tagId) })
            .ToList();

    public static TransactionResponse ToResponse(
        this Transaction transaction,
        IReadOnlyList<TransactionLine>? lines,
        IReadOnlyList<TagId>? tagIds = null,
        int attachmentCount = 0) => new(
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
        (tagIds ?? []).Select(tagId => tagId.Value).ToList(),
        attachmentCount);

    private static CategoryId? ResolveCategoryId(Guid? categoryId, bool isSplit)
    {
        if (isSplit || categoryId is not { } value)
        {
            return null;
        }

        return new CategoryId(value);
    }
}
