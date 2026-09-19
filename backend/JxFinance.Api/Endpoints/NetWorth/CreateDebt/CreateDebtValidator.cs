using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed class CreateDebtValidator : Validator<CreateDebtRequest>
{
    public CreateDebtValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.OutstandingAmount)
            .IsNonNegativeMoney()
            .WithMessage("Outstanding amount must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.InterestRate).InclusiveBetween(0, 100).When(r => r.InterestRate.HasValue);
        RuleFor(r => r.AsOf).NotEmpty();
    }
}
