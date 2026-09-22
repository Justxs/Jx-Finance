using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Data;

namespace JxFinance.Common.Trash;

[RegisterService<IDeletionRecorder>(LifeTime.Scoped)]
public sealed class DeletionRecorder(AppDbContext db, IClock clock) : IDeletionRecorder
{
    public DeletionEntry Record(TrashKind kind, Guid entityId, string description, Guid? companionId = null)
    {
        var entry = new DeletionEntry
        {
            Kind = kind,
            EntityId = entityId,
            Description = TextLimit.Ellipsize(description, DeletionEntry.DescriptionMaxLength),
            DeletedAt = clock.UtcNow,
            CompanionId = companionId,
        };
        db.DeletionEntries.Add(entry);
        return entry;
    }
}
