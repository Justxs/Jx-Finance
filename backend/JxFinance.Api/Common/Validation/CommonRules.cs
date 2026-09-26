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

    public static IRuleBuilderOptions<T, TProperty?> IsNotAfter<T, TProperty>(this IRuleBuilder<T, TProperty?> rule, Func<T, TProperty?> end)
        where TProperty : struct, IComparable<TProperty> =>
        rule.Must((request, value) => value is not { } start || end(request) is not { } limit || start.CompareTo(limit) <= 0)
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage("The start of the range must not be after its end.");

    public static IRuleBuilderOptions<T, TProperty?> IsNotBefore<T, TProperty>(this IRuleBuilder<T, TProperty?> rule, Func<T, TProperty?> start)
        where TProperty : struct, IComparable<TProperty> =>
        rule.Must((request, value) => value is not { } end || start(request) is not { } limit || end.CompareTo(limit) >= 0)
            .WithErrorCode(ErrorCodes.RangeInvalid);

    public static IRuleBuilderOptions<T, DateOnly?> IsNotInFuture<T>(this IRuleBuilder<T, DateOnly?> rule, Func<DateOnly> today) =>
        rule.Must(date => date is null || date <= today()).WithErrorCode(ErrorCodes.RangeInvalid);

    public static IRuleBuilderOptions<T, TProperty> DiffersFrom<T, TProperty>(
        this IRuleBuilder<T, TProperty> rule,
        Expression<Func<T, TProperty>> other) =>
        rule.NotEqual(other).WithErrorCode(ErrorCodes.ValueMustDiffer);
}
