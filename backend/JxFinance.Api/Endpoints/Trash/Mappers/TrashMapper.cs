using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Trash.Shared;

namespace JxFinance.Endpoints.Trash.Mappers;

public static class TrashMapper
{
    public static TrashEntryResponse ToResponse(this DeletionEntry entry) => new(
        entry.Id.Value,
        entry.Kind,
        entry.EntityId,
        entry.Description,
        entry.DeletedAt);
}
