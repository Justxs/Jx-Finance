using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed record ImportPreviewResponse(IReadOnlyList<ImportPreviewRow> Rows);
