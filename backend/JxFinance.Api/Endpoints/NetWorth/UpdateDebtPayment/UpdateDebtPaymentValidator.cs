using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.UpdateDebtPayment;

public sealed class UpdateDebtPaymentValidator : Validator<UpdateDebtPaymentRequest>
{
    public UpdateDebtPaymentValidator()
    {
        RuleFor(r => r.Kind).IsKnownEnum();
        RuleFor(r => r.Principal)
            .IsPositiveMoney()
            .WithMessage("Principal must be a positive decimal with at most 2 decimal places.");
    }
}
