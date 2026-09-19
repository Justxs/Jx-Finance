using FluentValidation;
using JxFinance.Common.Errors;

namespace JxFinance.Common.Validation;

public static class DecimalRules
{
    private const decimal MoneyLimit = 9999999999999999.99m;
    private const decimal QuantityLimit = 999999999999m;

    public static IRuleBuilderOptions<T, decimal> IsMoney<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.Must(value => FitsMoney(value)).WithErrorCode(ErrorCodes.MoneyInvalid);

    public static IRuleBuilderOptions<T, decimal?> IsMoney<T>(this IRuleBuilder<T, decimal?> rule) =>
        rule.Must(value => value is null || FitsMoney(value.Value)).WithErrorCode(ErrorCodes.MoneyInvalid);

    public static IRuleBuilderOptions<T, decimal> IsPositiveMoney<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.Must(value => value > 0 && FitsMoney(value)).WithErrorCode(ErrorCodes.MoneyPositive);

    public static IRuleBuilderOptions<T, decimal?> IsPositiveMoney<T>(this IRuleBuilder<T, decimal?> rule) =>
        rule.Must(value => value is null || (value > 0 && FitsMoney(value.Value))).WithErrorCode(ErrorCodes.MoneyPositive);

    public static IRuleBuilderOptions<T, decimal> IsNonNegativeMoney<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.Must(value => value >= 0 && FitsMoney(value)).WithErrorCode(ErrorCodes.MoneyNonNegative);

    public static IRuleBuilderOptions<T, decimal?> IsNonNegativeMoney<T>(this IRuleBuilder<T, decimal?> rule) =>
        rule.Must(value => value is null || (value >= 0 && FitsMoney(value.Value))).WithErrorCode(ErrorCodes.MoneyNonNegative);

    public static IRuleBuilderOptions<T, decimal?> IsPositiveQuantity<T>(this IRuleBuilder<T, decimal?> rule) =>
        rule.Must(value => value is null || (value > 0 && FitsQuantity(value.Value))).WithErrorCode(ErrorCodes.QuantityPositive);

    public static IRuleBuilderOptions<T, decimal?> IsNonNegativeQuantity<T>(this IRuleBuilder<T, decimal?> rule) =>
        rule.Must(value => value is null || (value >= 0 && FitsQuantity(value.Value))).WithErrorCode(ErrorCodes.QuantityNonNegative);

    public static bool FitsMoney(decimal value) => decimal.Round(value, 2) == value && Math.Abs(value) <= MoneyLimit;

    public static bool FitsQuantity(decimal value) => decimal.Round(value, 8) == value && Math.Abs(value) <= QuantityLimit;
}
