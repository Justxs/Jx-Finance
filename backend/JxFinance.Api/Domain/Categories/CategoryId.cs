using JxFinance.Domain.Common;

namespace JxFinance.Domain.Categories;

public readonly record struct CategoryId(Guid Value) : IStronglyTypedId<CategoryId>
{
    public static CategoryId From(Guid value) => new(value);

    public static CategoryId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
