namespace JxFinance.Domain.Investments;

public readonly record struct SecurityId(Guid Value)
{
    public static SecurityId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
