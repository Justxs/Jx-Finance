using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.Shared;

public abstract class TransactionFilterValidator<TRequest> : Validator<TRequest>
    where TRequest : ITransactionFilter
{
    protected TransactionFilterValidator()
    {
        RuleFor(r => r.TagIds)
            .Must(TagFilter.IsWellFormed)
            .WithErrorCode(ErrorCodes.TextInvalidFormat)
            .WithMessage($"tagIds must be up to {TagFilter.MaxTags} tag ids separated by commas.");
    }
}
