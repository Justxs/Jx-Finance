using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.InspectCsv;

public sealed class InspectCsvRequest
{
    public IFormFile File { get; set; } = default!;

    public CsvEncoding? Encoding { get; set; }

    public string? Delimiter { get; set; }

    public int? SkipLines { get; set; }
}
