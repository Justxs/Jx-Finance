using System.Globalization;
using JxFinance.Domain.Common;

namespace JxFinance.Common;

public static class MoneyWire
{
    public static string ToWire(Money money) => money.Amount.ToString("0.00", CultureInfo.InvariantCulture);

    public static Money Parse(string value, Currency currency = Currency.Eur) =>
        new(decimal.Parse(value, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture), currency);

    public static bool IsValid(string? value) => TryParse(value, out _);

    public static bool IsPositive(string? value) => TryParse(value, out var parsed) && parsed > 0;

    public static bool IsNonNegative(string? value) => TryParse(value, out var parsed) && parsed >= 0;

    private static bool TryParse(string? value, out decimal parsed)
    {
        parsed = 0m;
        return !string.IsNullOrWhiteSpace(value)
            && decimal.TryParse(value, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out parsed)
            && decimal.Round(parsed, 2) == parsed
            && Math.Abs(parsed) <= 9999999999999999.99m;
    }
}
