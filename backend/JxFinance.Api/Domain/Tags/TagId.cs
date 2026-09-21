using JxFinance.Domain.Common;

namespace JxFinance.Domain.Tags;

public readonly record struct TagId(Guid Value) : IStronglyTypedId<TagId>
{
    public static TagId From(Guid value) => new(value);

    public static TagId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
