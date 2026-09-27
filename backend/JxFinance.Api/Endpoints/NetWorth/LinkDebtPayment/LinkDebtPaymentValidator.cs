using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.LinkDebtPayment;

public sealed class LinkDebtPaymentValidator : Validator<LinkDebtPaymentRequest>
{
    public LinkDebtPaymentValidator()
    {
        RuleFor(r => r.TransactionId).IsRequired();
        RuleFor(r => r.Kind).IsKnownEnum().When(r => r.Kind.HasValue);
        RuleFor(r => r.Principal)
            .IsPositiveMoney()
            .WithMessage("Principal must be a positive decimal with at most 2 decimal places.");
    }
}
