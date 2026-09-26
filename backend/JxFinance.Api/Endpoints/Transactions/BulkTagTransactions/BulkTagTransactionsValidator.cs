using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Transactions.BulkTagTransactions;

public sealed class BulkTagTransactionsValidator : Validator<BulkTagTransactionsRequest>
{
    public const int MaxTransactions = 200;

    public BulkTagTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds)
            .IsRequired()
            .Must(ids => ids is null || ids.Count <= MaxTransactions)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"At most {MaxTransactions} transactions can be tagged at once.");
        RuleForEach(r => r.TransactionIds).IsRequired();
        RuleFor(r => r.TagIds)
            .IsPresent()
            .Must(ids => ids is null || ids.Distinct().Count() <= TagRules.MaxTags)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"A transaction carries at most {TagRules.MaxTags} tags.");
        RuleForEach(r => r.TagIds).IsRequired();
    }
}
