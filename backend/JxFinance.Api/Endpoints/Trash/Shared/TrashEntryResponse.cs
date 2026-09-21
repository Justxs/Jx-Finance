using JxFinance.Domain.Trash;

namespace JxFinance.Endpoints.Trash.Shared;

public sealed record TrashEntryResponse(
    Guid Id,
    TrashKind Kind,
    Guid EntityId,
    string Description,
    DateTimeOffset DeletedAt);
