using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Conversions.UpdateConversion;

public sealed class UpdateConversionValidator : Validator<UpdateConversionRequest>
{
    public UpdateConversionValidator()
    {
        RuleFor(r => r.FromCurrency).IsKnownEnum();
        RuleFor(r => r.ToCurrency)
            .IsKnownEnum()
            .DiffersFrom(r => r.FromCurrency)
            .WithMessage("Choose two different currencies.");
        RuleFor(r => r.FromAmount)
            .IsPositiveMoney()
            .WithMessage("Sold amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.ToAmount)
            .IsPositiveMoney()
            .WithMessage("Bought amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.FeeAmount)
            .IsPositiveMoney()
            .WithMessage("Fee must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.FeeCurrency)
            .Must((request, currency) => currency is null || currency == request.FromCurrency || currency == request.ToCurrency)
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage("The fee must be in one of the two converted currencies.");
        RuleFor(r => r.Date).IsRequired();
        RuleFor(r => r.Description).HasMaxLength(500);
    }
}
