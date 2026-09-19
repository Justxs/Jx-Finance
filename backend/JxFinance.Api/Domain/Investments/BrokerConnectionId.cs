namespace JxFinance.Domain.Investments;

public readonly record struct BrokerConnectionId(Guid Value)
{
    public static BrokerConnectionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
