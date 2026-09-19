using System.Linq.Expressions;
using FluentValidation;
using JxFinance.Common.Errors;

namespace JxFinance.Common.Validation;

public static class CommonRules
{
    public static IRuleBuilderOptions<T, TProperty> IsRequired<T, TProperty>(this IRuleBuilder<T, TProperty> rule) =>
        rule.NotEmpty().WithErrorCode(ErrorCodes.Required);

    public static IRuleBuilderOptions<T, TProperty> IsPresent<T, TProperty>(this IRuleBuilder<T, TProperty> rule) =>
        rule.NotNull().WithErrorCode(ErrorCodes.Required);

    public static IRuleBuilderOptions<T, TProperty> IsAbsent<T, TProperty>(this IRuleBuilder<T, TProperty> rule) =>
        rule.Null().WithErrorCode(ErrorCodes.ValueMustBeEmpty);

    public static IRuleBuilderOptions<T, string?> HasMaxLength<T>(this IRuleBuilder<T, string?> rule, int maximum) =>
        rule.MaximumLength(maximum).WithErrorCode(ErrorCodes.TextTooLong);

    public static IRuleBuilderOptions<T, string?> HasMinLength<T>(this IRuleBuilder<T, string?> rule, int minimum) =>
        rule.MinimumLength(minimum).WithErrorCode(ErrorCodes.TextTooShort);

    public static IRuleBuilderOptions<T, string?> HasFormat<T>(this IRuleBuilder<T, string?> rule, string pattern) =>
        rule.Matches(pattern).WithErrorCode(ErrorCodes.TextInvalidFormat);

    public static IRuleBuilderOptions<T, string?> IsEmail<T>(this IRuleBuilder<T, string?> rule) =>
        rule.EmailAddress().WithErrorCode(ErrorCodes.EmailInvalid);

    public static IRuleBuilderOptions<T, TProperty> IsKnownEnum<T, TProperty>(this IRuleBuilder<T, TProperty> rule) =>
        rule.IsInEnum().WithErrorCode(ErrorCodes.EnumInvalid);

    public static IRuleBuilderOptions<T, TProperty> IsWithin<T, TProperty>(this IRuleBuilder<T, TProperty> rule, TProperty from, TProperty to)
        where TProperty : IComparable<TProperty>, IComparable =>
        rule.InclusiveBetween(from, to).WithErrorCode(ErrorCodes.RangeInvalid);

    public static IRuleBuilderOptions<T, TProperty?> IsWithin<T, TProperty>(this IRuleBuilder<T, TProperty?> rule, TProperty from, TProperty to)
        where TProperty : struct, IComparable<TProperty>, IComparable =>
        rule.InclusiveBetween(from, to).WithErrorCode(ErrorCodes.RangeInvalid);

    public static IRuleBuilderOptions<T, TProperty> DiffersFrom<T, TProperty>(
        this IRuleBuilder<T, TProperty> rule,
        Expression<Func<T, TProperty>> other) =>
        rule.NotEqual(other).WithErrorCode(ErrorCodes.ValueMustDiffer);
}
