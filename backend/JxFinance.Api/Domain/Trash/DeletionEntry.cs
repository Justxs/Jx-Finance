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
    public List<DeletionChange> Changes { get; } = [];

    public void Remember(DeletionChangeKind kind, IEnumerable<Guid> rowIds) =>
        Changes.AddRange(rowIds.Distinct().Select(rowId => new DeletionChange
        {
            DeletionEntryId = Id,
            Kind = kind,
            RowId = rowId,
        }));

    public IReadOnlyList<Guid> Remembered(DeletionChangeKind kind) =>
        [.. Changes.Where(c => c.Kind == kind).Select(c => c.RowId)];

    public static DateTimeOffset WindowStart(DateTimeOffset now) => now.AddDays(-RetentionDays);
}
