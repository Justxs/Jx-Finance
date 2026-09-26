using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Common.Validation;

public static class UserRules
{
    public static IRuleBuilderOptions<T, string?> IsEmailAddress<T>(this IRuleBuilder<T, string?> rule) =>
        rule.IsRequired().IsEmail().HasMaxLength(256);

    public static IRuleBuilderOptions<T, string?> IsNewPassword<T>(this IRuleBuilder<T, string?> rule) =>
        rule.IsRequired().HasMinLength(8).HasMaxLength(100);

    public static IRuleBuilderOptions<T, string?> IsAppRole<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(role => role is AppRoles.Admin or AppRoles.Member)
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage($"Role must be '{AppRoles.Admin}' or '{AppRoles.Member}'.");
}
