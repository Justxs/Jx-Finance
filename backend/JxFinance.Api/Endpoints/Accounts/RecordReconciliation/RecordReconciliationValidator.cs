using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.RecordReconciliation;

public sealed class RecordReconciliationValidator : Validator<RecordReconciliationRequest>
{
    public RecordReconciliationValidator()
    {
        RuleFor(r => r.Date)
            .IsRequired()
            .IsNotInFuture(() => Resolve<IClock>().Today)
            .WithErrorCode(ErrorCodes.ReconciliationFutureDate)
            .WithMessage("The statement date cannot be in the future.");
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Balance)
            .IsPresent()
            .IsMoney()
            .WithMessage("Balance must be a decimal with at most 2 decimal places.");
    }
}
