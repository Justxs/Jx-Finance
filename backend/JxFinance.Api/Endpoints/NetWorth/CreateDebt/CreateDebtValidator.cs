using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed class CreateDebtValidator : Validator<CreateDebtRequest>
{
    public CreateDebtValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.OutstandingAmount)
            .Must(v => MoneyWire.IsValid(v) && MoneyWire.Parse(v).Amount >= 0)
            .WithMessage("Outstanding amount must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.InterestRate).InclusiveBetween(0, 100).When(r => r.InterestRate.HasValue);
        RuleFor(r => r.AsOf).NotEmpty();
    }
}
