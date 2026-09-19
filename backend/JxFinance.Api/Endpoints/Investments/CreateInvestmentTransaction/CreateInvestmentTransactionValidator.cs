using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.CreateInvestmentTransaction;

public sealed class CreateInvestmentTransactionValidator : Validator<CreateInvestmentTransactionRequest>
{
    public CreateInvestmentTransactionValidator()
    {
        RuleFor(r => r.AccountId).NotEmpty();
        RuleFor(r => r.Type).IsInEnum();
        RuleFor(r => r.Currency).IsInEnum();
        RuleFor(r => r.Date).NotEmpty();
        RuleFor(r => r.Description).MaximumLength(500);
        RuleFor(r => r.Fee)
            .Must(f => f is null || MoneyWire.IsNonNegative(f))
            .WithMessage("Fee must be a decimal of 0 or more with at most 2 decimal places.");

        When(r => r.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell, () =>
        {
            RuleFor(r => r.SecurityId).NotEmpty().WithMessage("Choose a security.");
            RuleFor(r => r.Quantity)
                .Must(QuantityWire.IsPositive)
                .WithMessage("Quantity must be a decimal greater than 0 with at most 8 decimal places.");
            RuleFor(r => r.Price)
                .Must(QuantityWire.IsNonNegative)
                .WithMessage("Price must be a decimal of 0 or more with at most 8 decimal places.");
        });

        When(r => r.Type is InvestmentTransactionType.Split, () =>
        {
            RuleFor(r => r.SecurityId).NotEmpty().WithMessage("Choose a security.");
            RuleFor(r => r.Quantity)
                .Must(QuantityWire.IsPositive)
                .WithMessage("Enter the split ratio as new shares per old share, for example 2 for a 2-for-1 split.");
        });

        When(
            r => r.Type is InvestmentTransactionType.Dividend or InvestmentTransactionType.WithholdingTax
                or InvestmentTransactionType.Interest or InvestmentTransactionType.Fee,
            () => RuleFor(r => r.Amount)
                .Must(MoneyWire.IsPositive)
                .WithMessage("Amount must be a decimal greater than 0 with at most 2 decimal places."));

        RuleFor(r => r.SecurityId)
            .NotEmpty()
            .When(r => r.Type is InvestmentTransactionType.Dividend or InvestmentTransactionType.WithholdingTax)
            .WithMessage("Choose a security.");
    }
}
