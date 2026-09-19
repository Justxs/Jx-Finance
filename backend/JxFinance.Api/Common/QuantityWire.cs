using System.Globalization;

namespace JxFinance.Common;

public static class QuantityWire
{
    private const NumberStyles Styles = NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint;

    public static string ToWire(decimal value) => value.ToString("0.########", CultureInfo.InvariantCulture);

    public static decimal Parse(string value) => decimal.Parse(value, Styles, CultureInfo.InvariantCulture);

    public static bool IsPositive(string? value) => TryParse(value, out var parsed) && parsed > 0;

    public static bool IsNonNegative(string? value) => TryParse(value, out var parsed) && parsed >= 0;

    private static bool TryParse(string? value, out decimal parsed)
    {
        parsed = 0m;
        return !string.IsNullOrWhiteSpace(value)
            && decimal.TryParse(value, Styles, CultureInfo.InvariantCulture, out parsed)
            && decimal.Round(parsed, 8) == parsed
            && Math.Abs(parsed) <= 999999999999m;
    }
}
