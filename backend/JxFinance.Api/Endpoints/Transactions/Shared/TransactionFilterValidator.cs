using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.Shared;

public abstract class TransactionFilterValidator<TRequest> : Validator<TRequest>
    where TRequest : ITransactionFilter
{
    protected TransactionFilterValidator()
    {
        RuleFor(r => r.TagIds)
            .Must(ids => GuidList.IsWellFormed(ids, TagRules.MaxTags))
            .WithErrorCode(ErrorCodes.TextInvalidFormat)
            .WithMessage($"tagIds must be up to {TagRules.MaxTags} tag ids separated by commas.");
    }
}
