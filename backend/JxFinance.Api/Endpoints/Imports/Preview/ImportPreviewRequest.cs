using Microsoft.AspNetCore.Http;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewRequest
{
    public IFormFile File { get; set; } = default!;

    public Guid AccountId { get; set; }
}
