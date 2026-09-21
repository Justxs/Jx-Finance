using JxFinance.Domain.Audit;

namespace JxFinance.Endpoints.Households.Shared;

public sealed record AuditEventResponse(
    Guid Id,
    DateTimeOffset OccurredAt,
    Guid ActorUserId,
    string ActorName,
    AuditAction Action,
    AuditEntityKind EntityKind,
    Guid? EntityId,
    string Description,
    int? Count,
    IReadOnlyList<AuditChangeResponse> Changes);

public sealed record AuditChangeResponse(string Field, string? From, string? To);
