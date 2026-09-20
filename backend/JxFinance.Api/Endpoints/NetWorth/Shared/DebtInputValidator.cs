using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.Shared;

public abstract class DebtInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IDebtInput
{
    protected DebtInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.OutstandingAmount)
            .IsPresent()
            .WithMessage("Outstanding amount is required.")
            .IsNonNegativeMoney()
            .WithMessage("Outstanding amount must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.InterestRate).IsWithin(0, 100).When(r => r.InterestRate.HasValue);
        RuleFor(r => r.AsOf).IsRequired();
    }
}
