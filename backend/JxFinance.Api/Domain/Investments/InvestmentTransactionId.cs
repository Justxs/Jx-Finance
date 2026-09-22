using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public readonly record struct InvestmentTransactionId(Guid Value) : IStronglyTypedId<InvestmentTransactionId>
{
    public static InvestmentTransactionId From(Guid value) => new(value);

    public static InvestmentTransactionId New() => new(Guid.NewGuid());

    public static bool operator >(InvestmentTransactionId left, InvestmentTransactionId right) =>
        GuidOrder.Compare(left.Value, right.Value) > 0;

    public static bool operator <(InvestmentTransactionId left, InvestmentTransactionId right) =>
        GuidOrder.Compare(left.Value, right.Value) < 0;

    public static bool operator >=(InvestmentTransactionId left, InvestmentTransactionId right) => !(left < right);

    public static bool operator <=(InvestmentTransactionId left, InvestmentTransactionId right) => !(left > right);

    public override string ToString() => Value.ToString();
}
