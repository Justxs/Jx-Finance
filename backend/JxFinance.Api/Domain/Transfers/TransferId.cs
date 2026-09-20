using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transfers;

public readonly record struct TransferId(Guid Value) : IStronglyTypedId<TransferId>
{
    public static TransferId From(Guid value) => new(value);

    public static TransferId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
