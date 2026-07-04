namespace JxFinance.Domain.Accounts;

public readonly record struct AccountId(Guid Value)
{
    public static AccountId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
