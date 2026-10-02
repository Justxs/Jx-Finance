using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
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
    private const string CostShareMessage = "Enter the share of the cost basis that moves to the new security, from 0 to 100 percent with at most 6 decimals.";

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

        When(r => r.Type is InvestmentTransactionType.SymbolChange, () =>
        {
            RuleFor(r => r.SecurityId).IsRequired().WithMessage("Choose the security the holding leaves.");
            RuleFor(r => r.RelatedSecurityId).IsRequired().WithMessage("Choose the security the holding moves to.");
            RuleFor(r => r.Quantity)
                .IsPresent()
                .WithMessage(QuantityMessage)
                .IsPositiveQuantity()
                .WithMessage(QuantityMessage);
        });

        When(r => r.Type is InvestmentTransactionType.Merger, () =>
        {
            RuleFor(r => r.SecurityId).IsRequired().WithMessage("Choose the security that was taken over.");
            RuleFor(r => r.Quantity)
                .IsPresent()
                .WithMessage(QuantityMessage)
                .IsPositiveQuantity()
                .WithMessage(QuantityMessage);
            RuleFor(r => r.RelatedQuantity)
                .IsPresent()
                .WithMessage(QuantityMessage)
                .IsPositiveQuantity()
                .WithMessage(QuantityMessage)
                .When(r => r.RelatedSecurityId is not null);
            RuleFor(r => r.Amount)
                .IsPresent()
                .WithMessage("Enter the cash received, or choose the security received.")
                .When(r => r.RelatedSecurityId is null);
            RuleFor(r => r.Amount).IsPositiveMoney().WithMessage(AmountMessage);
            RuleFor(r => r.CostShare)
                .IsPresent()
                .WithMessage(CostShareMessage)
                .When(r => r.RelatedSecurityId is not null && r.Amount is > 0m);
        });

        RuleFor(r => r.CostShare)
            .Must(share => share is null || (share is >= 0m and <= Portfolio.WholeCost && decimal.Round(share.Value, 6) == share))
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage(CostShareMessage);

        RuleFor(r => r.RelatedSecurityId)
            .DiffersFrom(r => r.SecurityId)
            .When(r => r.RelatedSecurityId is not null)
            .WithMessage("Choose a security other than the one the holding leaves.");

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
