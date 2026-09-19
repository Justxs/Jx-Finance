using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;

public sealed class BulkCategorizeTransactionsValidator : Validator<BulkCategorizeTransactionsRequest>
{
    public const int MaxTransactions = 200;

    public BulkCategorizeTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds)
            .IsRequired()
            .Must(ids => ids is null || ids.Count <= MaxTransactions)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"At most {MaxTransactions} transactions can be recategorized at once.");
        RuleForEach(r => r.TransactionIds).IsRequired();
    }
}
