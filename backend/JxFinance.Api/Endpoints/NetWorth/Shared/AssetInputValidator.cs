using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;

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
        RuleFor(r => r.AsOf)
            .IsRequired()
            .IsNotInFuture(() => Resolve<IClock>().Today)
            .WithMessage("The valuation date cannot be in the future.");
        RuleFor(r => r.Depreciation)
            .Must(d => d is null or { StartDate: not null, StartValue: not null, LifeMonths: not null, ResidualValue: not null })
            .WithErrorCode(ErrorCodes.AssetDepreciationIncomplete)
            .WithMessage("Give the start date, start value, useful life and residual value, or none of them.");
        When(r => r.Depreciation is not null, () =>
        {
            RuleFor(r => r.Depreciation!.StartDate)
                .IsNotInFuture(() => Resolve<IClock>().Today)
                .WithMessage("Depreciation cannot start in the future.");
            RuleFor(r => r.Depreciation!.StartValue)
                .IsNonNegativeMoney()
                .Must((r, value) => value is null || r.Depreciation!.ResidualValue is not { } residual || value > residual)
                .WithErrorCode(ErrorCodes.RangeInvalid)
                .WithMessage("The start value must be above the residual value.");
            RuleFor(r => r.Depreciation!.ResidualValue).IsNonNegativeMoney();
            RuleFor(r => r.Depreciation!.LifeMonths).IsWithin(1, Depreciation.MaxLifeMonths);
        });
    }
}
