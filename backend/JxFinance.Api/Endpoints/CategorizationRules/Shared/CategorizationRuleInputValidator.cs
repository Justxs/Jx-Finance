using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public abstract class CategorizationRuleInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ICategorizationRuleInput
{
    protected CategorizationRuleInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(RuleLimits.NameMaxLength);
        RuleFor(r => r.Pattern).IsRequired().HasMaxLength(RuleLimits.PatternMaxLength);
        RuleFor(r => r.Match).IsKnownEnum();
        RuleFor(r => r.MinAmount).IsNonNegativeMoney();
        RuleFor(r => r.MaxAmount).IsNonNegativeMoney();
        RuleFor(r => r.MaxAmount)
            .IsNotBefore(r => r.MinAmount)
            .WithMessage("The highest amount cannot be below the lowest one.");
        RuleFor(r => r.TagIds)
            .IsPresent()
            .HasAtMostTags()
            .WithMessage($"A rule adds at most {TagRules.MaxTags} tags.");
        RuleForEach(r => r.TagIds).IsRequired();
        RuleFor(r => r.CategoryId)
            .Must((request, categoryId) => categoryId is not null || request.TagIds is { Count: > 0 })
            .WithErrorCode(ErrorCodes.Required)
            .WithMessage("A rule has to set a category, a tag, or both.");
    }
}
