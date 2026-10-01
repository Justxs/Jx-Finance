using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Contacts.Shared;

public abstract class ContactSplitInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IContactSplitInput
{
    public const int MaxShares = 20;
    public const int MaxWeight = 100;

    protected ContactSplitInputValidator()
    {
        RuleFor(r => r.Method).IsKnownEnum();
        RuleFor(r => r.Shares)
            .Must(shares => shares is { Count: > 0 })
            .WithErrorCode(ErrorCodes.ContactNoPerson)
            .WithMessage("Split with at least one person.");
        RuleFor(r => r.Shares)
            .Must(shares => shares is null || shares.Count <= MaxShares)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"Split with at most {MaxShares} people.");
        RuleFor(r => r.Shares)
            .Must(shares => shares is null || shares.Select(s => s.ContactId).Distinct().Count() == shares.Count)
            .WithErrorCode(ErrorCodes.ConflictDuplicate)
            .WithMessage("Each person can appear once.");
        RuleForEach(r => r.Shares).ChildRules(share =>
        {
            share.RuleFor(s => s.ContactId).IsRequired();
            share.RuleFor(s => s.Amount).IsNonNegativeMoney();
        });
        RuleFor(r => r.Own!.Amount).IsNonNegativeMoney().When(r => r.Own is not null);
        When(r => r.Method == SplitMethod.Shares, () =>
        {
            RuleForEach(r => r.Shares).ChildRules(share => share.RuleFor(s => s.Weight).IsPresent().IsWithin(1, MaxWeight));
            RuleFor(r => r.Own!.Weight).IsPresent().IsWithin(1, MaxWeight).When(r => r.Own is not null);
        });
        When(r => r.Method == SplitMethod.Exact, () =>
        {
            RuleForEach(r => r.Shares).ChildRules(share => share.RuleFor(s => s.Amount).IsPresent());
            RuleFor(r => r.Own!.Amount).IsPresent().When(r => r.Own is not null);
        });
    }
}
