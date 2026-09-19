using System.Globalization;
using System.Text.Json;

namespace JxFinance.Common.Json;

public static class DecimalString
{
    public const string Format = "decimal";

    public const string Invalid = "Must be a decimal string such as \"12.50\", with a dot as the decimal separator and no grouping.";

    private const NumberStyles Styles = NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint;

    public static decimal Read(ref Utf8JsonReader reader) =>
        reader.TokenType == JsonTokenType.String
        && decimal.TryParse(reader.GetString(), Styles, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : throw new DecimalStringException();
}
