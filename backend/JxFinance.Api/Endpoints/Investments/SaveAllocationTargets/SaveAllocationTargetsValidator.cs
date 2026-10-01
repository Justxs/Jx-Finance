using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.SaveAllocationTargets;

public sealed class SaveAllocationTargetsValidator : Validator<SaveAllocationTargetsRequest>
{
    public SaveAllocationTargetsValidator()
    {
        RuleFor(r => r.Dimension).IsKnownEnum();
        RuleFor(r => r.Targets).IsPresent();
        RuleFor(r => r.Targets)
            .Must(targets => targets is null || targets.Count <= AllocationTarget.MaxTargets)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"At most {AllocationTarget.MaxTargets} targets.");
        RuleForEach(r => r.Targets)
            .Must(target => target.Share is >= 0m and <= AllocationTarget.WholeShare && decimal.Round(target.Share, 2) == target.Share)
            .WithErrorCode(ErrorCodes.AllocationShareInvalid)
            .WithMessage("A share is a percentage between 0 and 100 with at most two decimals.");
        RuleForEach(r => r.Targets)
            .Must((request, target) => AllocationBucket.IsWellFormed(request.Dimension, target.Key))
            .WithErrorCode(ErrorCodes.AllocationBucketUnknown)
            .WithMessage("This is not a security type, currency or security id of the chosen dimension.");
        RuleFor(r => r.Targets)
            .Must(targets => targets is null || targets.Select(t => t.Key).Distinct(StringComparer.Ordinal).Count() == targets.Count)
            .WithErrorCode(ErrorCodes.AllocationBucketDuplicate)
            .WithMessage("Each bucket may have one target only.");
        RuleFor(r => r.Targets)
            .Must(targets => targets is null || targets.Count == 0 || targets.Sum(t => t.Share) == AllocationTarget.WholeShare)
            .WithErrorCode(ErrorCodes.AllocationSharesTotal)
            .WithMessage("The shares must add up to 100.");
    }
}
