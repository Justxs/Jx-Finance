using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed class CreateAssetValidator : Validator<CreateAssetRequest>
{
    public CreateAssetValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.CurrentValue)
            .Must(MoneyWire.IsNonNegative)
            .WithMessage("Current value must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.AsOf).NotEmpty();
    }
}
