using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.Shared;

public abstract class AssetInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IAssetInput
{
    protected AssetInputValidator()
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
