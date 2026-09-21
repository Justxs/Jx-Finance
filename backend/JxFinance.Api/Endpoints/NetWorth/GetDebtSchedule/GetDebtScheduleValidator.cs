using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.GetDebtSchedule;

public sealed class GetDebtScheduleValidator : Validator<GetDebtScheduleRequest>
{
    private const string NonNegativeMoney = "Must be a non-negative decimal string with at most 2 decimal places, such as \"150.00\".";

    public GetDebtScheduleValidator()
    {
        RuleFor(r => r.ExtraMonthly)
            .Must(text => text is null || DecimalRules.ParseMoneyText(text) is >= 0)
            .WithErrorCode(ErrorCodes.MoneyNonNegative)
            .WithMessage(NonNegativeMoney);
        RuleFor(r => r.LumpSum)
            .Must(text => text is null || DecimalRules.ParseMoneyText(text) is >= 0)
            .WithErrorCode(ErrorCodes.MoneyNonNegative)
            .WithMessage(NonNegativeMoney);
        RuleFor(r => r.LumpSumDate)
            .IsPresent()
            .WithMessage("A lump sum needs the date it is paid.")
            .When(r => DecimalRules.ParseMoneyText(r.LumpSum) is > 0);
    }
}
