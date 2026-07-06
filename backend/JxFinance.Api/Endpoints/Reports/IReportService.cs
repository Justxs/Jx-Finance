namespace JxFinance.Endpoints.Reports;

public interface IReportService
{
    Task<ReportSummaryResponse> GetSummaryAsync(DateOnly? dateFrom, DateOnly? dateTo, CancellationToken cancellationToken);
}
