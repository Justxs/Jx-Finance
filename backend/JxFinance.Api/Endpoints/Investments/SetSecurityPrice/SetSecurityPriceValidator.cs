using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Investments.SetSecurityPrice;

public sealed class SetSecurityPriceValidator : Validator<SetSecurityPriceRequest>
{
    public SetSecurityPriceValidator()
    {
        RuleFor(r => r.LastPrice).IsPresent();
        RuleFor(r => r.LastPrice)
            .IsNonNegativeQuantity()
            .WithMessage("Price must be a decimal of 0 or more with at most 8 decimal places.");
        RuleFor(r => r.LastPriceDate)
            .Must(date => date is null || date <= Resolve<IClock>().Today)
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage("The price date cannot be in the future.");
    }
}
