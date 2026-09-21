using JxFinance.Domain.Common;

namespace JxFinance.Domain.Trash;

public readonly record struct DeletionEntryId(Guid Value) : IStronglyTypedId<DeletionEntryId>
{
    public static DeletionEntryId From(Guid value) => new(value);

    public static DeletionEntryId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
