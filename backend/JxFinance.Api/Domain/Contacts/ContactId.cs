using JxFinance.Domain.Common;

namespace JxFinance.Domain.Contacts;

public readonly record struct ContactId(Guid Value) : IStronglyTypedId<ContactId>
{
    public static ContactId From(Guid value) => new(value);

    public static ContactId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
