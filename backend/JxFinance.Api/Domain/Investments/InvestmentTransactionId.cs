namespace JxFinance.Domain.Investments;

public readonly record struct InvestmentTransactionId(Guid Value)
{
    public static InvestmentTransactionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
