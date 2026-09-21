using JxFinance.Domain.Common;

namespace JxFinance.Domain.Trash;

public sealed class DeletionEntry : OwnableEntity
{
    public const int DescriptionMaxLength = 200;
    public const int RetentionDays = 30;

    public DeletionEntryId Id { get; set; } = DeletionEntryId.New();
    public TrashKind Kind { get; set; }
    public Guid EntityId { get; set; }
    public required string Description { get; set; }
    public DateTimeOffset DeletedAt { get; set; }
    public DateTimeOffset? RestoredAt { get; set; }
    public Guid? CompanionId { get; set; }

    public static DateTimeOffset WindowStart(DateTimeOffset now) => now.AddDays(-RetentionDays);
}
