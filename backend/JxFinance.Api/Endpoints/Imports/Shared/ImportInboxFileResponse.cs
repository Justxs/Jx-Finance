using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Shared;

public sealed record ImportInboxFileResponse(
    Guid Id,
    string FileName,
    StatementFormat Format,
    Guid AccountId,
    Guid? MappingId,
    DateTimeOffset ReceivedAt);
