using JxFinance.Endpoints.Reports.Shared;

namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummaryRequest
{
    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }

    public ReportComparisonMode? Comparison { get; init; }
}
