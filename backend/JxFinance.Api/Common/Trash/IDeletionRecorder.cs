using JxFinance.Domain.Trash;

namespace JxFinance.Common.Trash;

public interface IDeletionRecorder
{
    void Record(TrashKind kind, Guid entityId, string description, Guid? companionId = null);
}
