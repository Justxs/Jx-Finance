using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public readonly record struct InvestmentTransactionId(Guid Value) : IStronglyTypedId<InvestmentTransactionId>
{
    public static InvestmentTransactionId From(Guid value) => new(value);

    public static InvestmentTransactionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
