using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Sharing;

public static class SharingRules
{
    public static IRuleBuilderOptions<T, Guid?> RequiresHouseholdWhenShared<T>(this IRuleBuilder<T, Guid?> rule, string noun)
        where T : IShareableInput =>
        rule.NotNull()
            .WithErrorCode(ErrorCodes.HouseholdRequired)
            .WithMessage($"A shared {noun} needs a household.")
            .When(input => input.Scope == Scope.Shared);
}
