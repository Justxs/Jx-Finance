using JxFinance.Domain.Common;

namespace JxFinance.Domain.MonthCloses;

public readonly record struct MonthCloseId(Guid Value) : IStronglyTypedId<MonthCloseId>
{
    public static MonthCloseId From(Guid value) => new(value);

    public static MonthCloseId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
