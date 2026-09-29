using JxFinance.Endpoints.Imports.Parsing;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed record ImportConfirmRequest(
    Guid AccountId,
    IReadOnlyList<ImportConfirmRow> Rows,
    StatementFormat Format,
    ImportStatementBalance? Statement = null,
    Guid? MappingId = null);
