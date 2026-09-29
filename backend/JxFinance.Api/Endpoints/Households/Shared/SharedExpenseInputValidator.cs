using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households.Shared;

public abstract class SharedExpenseInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ISharedExpenseInput
{
    public const int MaxShares = 20;
    public const int MaxWeight = 100;

    protected SharedExpenseInputValidator()
    {
        RuleFor(r => r.Method).IsKnownEnum();
        RuleFor(r => r.Shares)
            .Must(shares => shares is { Count: > 0 and <= MaxShares })
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"Split between 1 and {MaxShares} members.");
        RuleFor(r => r.Shares)
            .Must(shares => shares is null || shares.Select(s => s.UserId).Distinct().Count() == shares.Count)
            .WithErrorCode(ErrorCodes.ConflictDuplicate)
            .WithMessage("Each member can appear once.");
        RuleForEach(r => r.Shares).ChildRules(share =>
        {
            share.RuleFor(s => s.UserId).IsRequired();
            share.RuleFor(s => s.Amount).IsNonNegativeMoney();
        });
        When(r => r.Method == SplitMethod.Shares, () =>
            RuleForEach(r => r.Shares).ChildRules(share =>
                share.RuleFor(s => s.Weight).IsPresent().IsWithin(1, MaxWeight)));
        When(r => r.Method == SplitMethod.Exact, () =>
            RuleForEach(r => r.Shares).ChildRules(share => share.RuleFor(s => s.Amount).IsPresent()));
    }
}
