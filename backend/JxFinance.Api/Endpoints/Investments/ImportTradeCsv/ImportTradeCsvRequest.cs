namespace JxFinance.Endpoints.Investments.ImportTradeCsv;

public sealed class ImportTradeCsvRequest
{
    public IFormFile File { get; set; } = default!;

    public Guid AccountId { get; set; }
}
