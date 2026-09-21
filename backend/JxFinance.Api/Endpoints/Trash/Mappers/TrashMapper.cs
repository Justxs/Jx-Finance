using FastEndpoints;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Trash.Shared;

namespace JxFinance.Endpoints.Trash.Mappers;

[RegisterService<TrashMapper>(LifeTime.Singleton)]
public sealed class TrashMapper : Mapper<EmptyRequest, TrashEntryResponse, DeletionEntry>
{
    public override TrashEntryResponse FromEntity(DeletionEntry entry) => new(
        entry.Id.Value,
        entry.Kind,
        entry.EntityId,
        entry.Description,
        entry.DeletedAt);
}
