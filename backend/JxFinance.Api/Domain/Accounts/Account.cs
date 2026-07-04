using JxFinance.Domain.Common;

namespace JxFinance.Domain.Accounts;

public sealed class Account : OwnableEntity
{
    public AccountId Id { get; set; } = AccountId.New();
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Iban { get; set; }
    public AccountType Type { get; set; }
    public Money StartingBalance { get; set; }
}
