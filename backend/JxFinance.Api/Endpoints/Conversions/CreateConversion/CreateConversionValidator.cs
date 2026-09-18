using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.Conversions.CreateConversion;

public sealed class CreateConversionValidator : Validator<CreateConversionRequest>
{
    public CreateConversionValidator()
    {
        RuleFor(r => r.AccountId).NotEmpty();
        RuleFor(r => r.FromCurrency).IsInEnum();
        RuleFor(r => r.ToCurrency)
            .IsInEnum()
            .NotEqual(r => r.FromCurrency)
            .WithMessage("Choose two different currencies.");
        RuleFor(r => r.FromAmount)
            .Must(MoneyWire.IsPositive)
            .WithMessage("Sold amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.ToAmount)
            .Must(MoneyWire.IsPositive)
            .WithMessage("Bought amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.FeeAmount)
            .Must(a => a is null || MoneyWire.IsPositive(a))
            .WithMessage("Fee must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.FeeCurrency)
            .Must((request, currency) => currency is null || currency == request.FromCurrency || currency == request.ToCurrency)
            .WithMessage("The fee must be in one of the two converted currencies.");
        RuleFor(r => r.Date).NotEmpty();
        RuleFor(r => r.Description).MaximumLength(500);
    }
}
