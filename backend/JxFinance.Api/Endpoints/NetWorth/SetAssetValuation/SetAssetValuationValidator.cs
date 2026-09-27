using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.SetAssetValuation;

public sealed class SetAssetValuationValidator : Validator<SetAssetValuationRequest>
{
    public SetAssetValuationValidator()
    {
        RuleFor(r => r.Date)
            .IsRequired()
            .IsNotInFuture(() => Resolve<IClock>().Today)
            .WithMessage("The valuation date cannot be in the future.");
        RuleFor(r => r.Value)
            .IsPresent()
            .IsNonNegativeMoney()
            .WithMessage("Value must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.Note).HasMaxLength(AssetValuation.NoteMaxLength);
    }
}
