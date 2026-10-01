using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewRequest
{
    public IFormFile File { get; set; } = default!;

    public Guid AccountId { get; set; }

    public StatementFormat Format { get; set; }

    public Guid? MappingId { get; set; }
}
