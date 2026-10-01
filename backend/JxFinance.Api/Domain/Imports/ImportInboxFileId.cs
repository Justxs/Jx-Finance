using JxFinance.Domain.Common;

namespace JxFinance.Domain.Imports;

public readonly record struct ImportInboxFileId(Guid Value) : IStronglyTypedId<ImportInboxFileId>
{
    public static ImportInboxFileId From(Guid value) => new(value);

    public static ImportInboxFileId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
