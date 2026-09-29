using System.Globalization;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Common;

public static class MonthKey
{
    public const int MinYear = 2000;
    public const int MaxYear = 2999;

    public static readonly DomainError Invalid = new(
        ErrorCodes.MonthInvalid,
        $"Give the month as YYYY-MM, between {MinYear} and {MaxYear}.");

    public static Result<DateOnly> Parse(string? text)
    {
        if (DateOnly.TryParseExact(
                $"{text?.Trim()}-01",
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var month)
            && IsSupportedYear(month.Year))
        {
            return month;
        }

        return Invalid;
    }

    public static bool IsSupportedYear(int year) => year is >= MinYear and <= MaxYear;
}
