using System.Globalization;
using JxFinance.Domain.Common;

namespace JxFinance.Common;

public static class MoneyWire
{
    public static string ToWire(Money money) => money.Amount.ToString("0.00", CultureInfo.InvariantCulture);

    public static Money Parse(string value) =>
        new(decimal.Parse(value, NumberStyles.Number, CultureInfo.InvariantCulture));

    public static bool IsValid(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
        && decimal.Round(parsed, 2) == parsed;
}
