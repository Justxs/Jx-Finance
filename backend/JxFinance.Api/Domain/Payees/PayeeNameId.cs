using JxFinance.Domain.Common;

namespace JxFinance.Domain.Payees;

public readonly record struct PayeeNameId(Guid Value) : IStronglyTypedId<PayeeNameId>
{
    public static PayeeNameId From(Guid value) => new(value);

    public static PayeeNameId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
