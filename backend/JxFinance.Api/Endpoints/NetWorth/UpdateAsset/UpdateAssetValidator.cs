using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed class UpdateAssetValidator : Validator<UpdateAssetRequest>
{
    public UpdateAssetValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.CurrentValue)
            .IsPresent()
            .WithMessage("Current value is required.")
            .IsNonNegativeMoney()
            .WithMessage("Current value must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.AsOf).IsRequired();
    }
}
