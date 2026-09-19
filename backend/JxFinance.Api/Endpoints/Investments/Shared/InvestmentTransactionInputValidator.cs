using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public abstract class InvestmentTransactionInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IInvestmentTransactionInput
{
    private const string QuantityMessage = "Quantity must be a decimal greater than 0 with at most 8 decimal places.";
    private const string PriceMessage = "Price must be a decimal of 0 or more with at most 8 decimal places.";
    private const string SplitMessage = "Enter the split ratio as new shares per old share, for example 2 for a 2-for-1 split.";
    private const string AmountMessage = "Amount must be a decimal greater than 0 with at most 2 decimal places.";

    protected InvestmentTransactionInputValidator()
    {
        RuleFor(r => r.AccountId).IsRequired();
        RuleFor(r => r.Type).IsKnownEnum();
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Date).IsRequired();
        RuleFor(r => r.Description).HasMaxLength(500);
        RuleFor(r => r.Fee)
            .IsNonNegativeMoney()
            .WithMessage("Fee must be a decimal of 0 or more with at most 2 decimal places.");

        When(r => r.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell, () =>
        {
            RuleFor(r => r.SecurityId).IsRequired().WithMessage("Choose a security.");
            RuleFor(r => r.Quantity)
                .IsPresent()
                .WithMessage(QuantityMessage)
                .IsPositiveQuantity()
                .WithMessage(QuantityMessage);
            RuleFor(r => r.Price)
                .IsPresent()
                .WithMessage(PriceMessage)
                .IsNonNegativeQuantity()
                .WithMessage(PriceMessage);
        });

        When(r => r.Type is InvestmentTransactionType.Split, () =>
        {
            RuleFor(r => r.SecurityId).IsRequired().WithMessage("Choose a security.");
            RuleFor(r => r.Quantity)
                .IsPresent()
                .WithMessage(SplitMessage)
                .IsPositiveQuantity()
                .WithMessage(SplitMessage);
        });

        When(
            r => r.Type is InvestmentTransactionType.Dividend or InvestmentTransactionType.WithholdingTax
                or InvestmentTransactionType.Interest or InvestmentTransactionType.Fee,
            () => RuleFor(r => r.Amount)
                .IsPositiveMoney()
                .WithMessage("Amount must be a decimal greater than 0 with at most 2 decimal places."));

        RuleFor(r => r.SecurityId)
            .IsRequired()
            .When(r => r.Type is InvestmentTransactionType.Dividend or InvestmentTransactionType.WithholdingTax)
            .WithMessage("Choose a security.");
    }
}
