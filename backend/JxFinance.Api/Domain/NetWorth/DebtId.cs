namespace JxFinance.Domain.NetWorth;

public readonly record struct DebtId(Guid Value)
{
    public static DebtId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
