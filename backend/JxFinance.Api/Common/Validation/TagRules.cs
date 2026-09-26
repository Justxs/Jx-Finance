using FluentValidation;
using JxFinance.Common.Errors;

namespace JxFinance.Common.Validation;

public static class TagRules
{
    public const int MaxTags = 10;

    public static IRuleBuilderOptions<T, IReadOnlyList<Guid>?> HasAtMostTags<T>(this IRuleBuilder<T, IReadOnlyList<Guid>?> rule) =>
        rule.Must(ids => ids is null || ids.Distinct().Count() <= MaxTags)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"A transaction carries at most {MaxTags} tags.");
}
