using System.Globalization;

namespace JxFinance.Common.Formats;

public static class DateFormats
{
    public const string IsoDate = "yyyy-MM-dd";

    public static string Iso(DateOnly date) => date.ToString(IsoDate, CultureInfo.InvariantCulture);
}
