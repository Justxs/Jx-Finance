namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummaryRequest
{
    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }
}
