namespace JxFinance.Domain.Transfers;

public readonly record struct TransferId(Guid Value)
{
    public static TransferId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
