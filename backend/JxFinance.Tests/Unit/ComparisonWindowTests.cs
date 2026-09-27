using JxFinance.Common;
using JxFinance.Endpoints.Reports.Shared;

namespace JxFinance.Tests.Unit;

public sealed class ComparisonWindowTests
{
    [Theory]
    [InlineData("2026-03-01", "2026-03-31", "2026-02-01", "2026-02-28")]
    [InlineData("2024-03-01", "2024-03-31", "2024-02-01", "2024-02-29")]
    [InlineData("2024-02-01", "2024-02-29", "2024-01-01", "2024-01-31")]
    [InlineData("2026-04-10", "2026-04-20", "2026-03-10", "2026-03-20")]
    [InlineData("2026-03-30", "2026-03-30", "2026-02-28", "2026-02-28")]
    [InlineData("2026-01-01", "2026-01-31", "2025-12-01", "2025-12-31")]
    public void The_previous_month_is_the_same_calendar_span_one_month_earlier(
        string from,
        string to,
        string expectedFrom,
        string expectedTo)
    {
        var window = ComparisonWindow.For(ReportComparisonMode.PreviousMonth, DateWindow.Inclusive(Date(from), Date(to)));

        Assert.Equal((Date(expectedFrom), Date(expectedTo)), (window!.Value.Start, window.Value.InclusiveEnd));
    }

    [Theory]
    [InlineData("2025-02-01", "2025-02-28", "2024-02-01", "2024-02-29")]
    [InlineData("2024-02-29", "2024-02-29", "2023-02-28", "2023-02-28")]
    [InlineData("2026-04-10", "2026-04-20", "2025-04-10", "2025-04-20")]
    public void The_previous_year_still_keeps_month_ends_whole(string from, string to, string expectedFrom, string expectedTo)
    {
        var window = ComparisonWindow.For(ReportComparisonMode.PreviousYear, DateWindow.Inclusive(Date(from), Date(to)));

        Assert.Equal((Date(expectedFrom), Date(expectedTo)), (window!.Value.Start, window.Value.InclusiveEnd));
    }

    private static DateOnly Date(string text) => DateOnly.Parse(text, System.Globalization.CultureInfo.InvariantCulture);
}
