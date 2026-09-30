using System.Globalization;

namespace JxFinance.Common.Formats;

public static class CsvNumber
{
    public static decimal? Parse(string? text)
    {
        if (text is null)
        {
            return null;
        }

        var decimalComma = text.LastIndexOf(',') > text.LastIndexOf('.');
        var normalized = decimalComma
            ? text.Replace(".", "", StringComparison.Ordinal).Replace(',', '.')
            : text.Replace(",", "", StringComparison.Ordinal);
        return decimal.TryParse(normalized, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value)
            ? value
            : null;
    }
}
