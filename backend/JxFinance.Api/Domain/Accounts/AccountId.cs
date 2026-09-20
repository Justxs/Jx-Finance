using JxFinance.Domain.Common;

namespace JxFinance.Domain.Accounts;

public readonly record struct AccountId(Guid Value) : IStronglyTypedId<AccountId>
{
    public static AccountId From(Guid value) => new(value);

    public static AccountId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
