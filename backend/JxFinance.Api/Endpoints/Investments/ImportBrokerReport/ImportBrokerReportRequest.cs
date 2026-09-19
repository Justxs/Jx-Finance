namespace JxFinance.Endpoints.Investments.ImportBrokerReport;

public sealed class ImportBrokerReportRequest
{
    public IFormFile File { get; set; } = default!;

    public Guid AccountId { get; set; }

    public Guid? FundingAccountId { get; set; }
}
