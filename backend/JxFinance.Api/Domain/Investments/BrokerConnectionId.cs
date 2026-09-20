using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public readonly record struct BrokerConnectionId(Guid Value) : IStronglyTypedId<BrokerConnectionId>
{
    public static BrokerConnectionId From(Guid value) => new(value);

    public static BrokerConnectionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
