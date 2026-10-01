using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Settings.SetExchangeRate;

public sealed class SetExchangeRateValidator : Validator<SetExchangeRateRequest>
{
    public SetExchangeRateValidator()
    {
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Currency)
            .NotEqual(Currency.Eur)
            .WithErrorCode(ErrorCodes.ExchangeRateUnsupportedCurrency)
            .WithMessage("Rates are units per euro, so the euro has no rate of its own.");
        RuleFor(r => r.Date)
            .IsNotInFuture(() => Resolve<IClock>().Today)
            .WithErrorCode(ErrorCodes.ExchangeRateFutureDate)
            .WithMessage("A rate cannot be dated after today.");
        RuleFor(r => r.Rate).IsPresent();
        RuleFor(r => r.Rate)
            .Must(rate => rate is null || (rate > 0 && DecimalRules.FitsQuantity(rate.Value)))
            .WithErrorCode(ErrorCodes.ExchangeRateNotPositive)
            .WithMessage("The rate must be above zero, with at most 8 decimal places.");
    }
}
