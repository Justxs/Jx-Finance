using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions.Shared;

public abstract class TransactionFilterValidator<TRequest> : Validator<TRequest>
    where TRequest : TransactionFilterRequest
{
    protected TransactionFilterValidator()
    {
        RuleFor(r => r.TagIds)
            .Must(ids => GuidList.IsWellFormed(ids, TagRules.MaxTags))
            .WithErrorCode(ErrorCodes.TextInvalidFormat)
            .WithMessage($"tagIds must be up to {TagRules.MaxTags} tag ids separated by commas.");
        RuleFor(r => r.Payee).HasMaxLength(500);
        RuleFor(r => r.Place).HasMaxLength(TransactionPlace.MaxLength);
        RuleFor(r => r.AmountMin).IsNonNegativeMoney();
        RuleFor(r => r.AmountMax).IsNonNegativeMoney();
        RuleFor(r => r.AmountMax)
            .IsNotBefore(r => r.AmountMin)
            .WithMessage("The highest amount cannot be below the lowest one.");
    }
}
