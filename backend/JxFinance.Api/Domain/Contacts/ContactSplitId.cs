using JxFinance.Domain.Common;

namespace JxFinance.Domain.Contacts;

public readonly record struct ContactSplitId(Guid Value) : IStronglyTypedId<ContactSplitId>
{
    public static ContactSplitId From(Guid value) => new(value);

    public static ContactSplitId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
