using JxFinance.Domain.Common;

namespace JxFinance.Domain.Accounts;

public readonly record struct AccountReconciliationId(Guid Value) : IStronglyTypedId<AccountReconciliationId>
{
    public static AccountReconciliationId From(Guid value) => new(value);

    public static AccountReconciliationId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
