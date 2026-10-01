using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.GetReconciliationPreview;

public sealed class GetReconciliationPreviewValidator : Validator<GetReconciliationPreviewRequest>
{
    public GetReconciliationPreviewValidator()
    {
        RuleFor(r => r.Date)
            .IsRequired()
            .IsNotInFuture(() => Resolve<IClock>().Today)
            .WithErrorCode(ErrorCodes.ReconciliationFutureDate)
            .WithMessage("The statement date cannot be in the future.");
        RuleFor(r => r.Currency).IsKnownEnum();
    }
}
