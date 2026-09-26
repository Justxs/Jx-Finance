using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.GetDebtSchedule;

public sealed class GetDebtScheduleValidator : Validator<GetDebtScheduleRequest>
{
    public GetDebtScheduleValidator()
    {
        RuleFor(r => r.ExtraMonthly).IsNonNegativeMoneyText();
        RuleFor(r => r.LumpSum).IsNonNegativeMoneyText();
        RuleFor(r => r.LumpSumDate)
            .IsPresent()
            .WithMessage("A lump sum needs the date it is paid.")
            .When(r => DecimalRules.ParseMoneyText(r.LumpSum) is > 0);
    }
}
