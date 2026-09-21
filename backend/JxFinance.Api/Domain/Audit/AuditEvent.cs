using JxFinance.Domain.Households;

namespace JxFinance.Domain.Audit;

public sealed class AuditEvent
{
    public const int DescriptionMaxLength = 200;
    public const int ValueMaxLength = 120;
    public const int MaxChanges = 12;
    public const int RetentionDays = 400;

    public AuditEventId Id { get; set; } = AuditEventId.New();
    public HouseholdId HouseholdId { get; set; }
    public Guid ActorUserId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public AuditAction Action { get; set; }
    public AuditEntityKind EntityKind { get; set; }
    public Guid? EntityId { get; set; }
    public required string Description { get; set; }
    public int? Count { get; set; }
    public List<AuditChange> Changes { get; set; } = [];

    public static DateTimeOffset RetentionStart(DateTimeOffset now) => now.AddDays(-RetentionDays);
}
