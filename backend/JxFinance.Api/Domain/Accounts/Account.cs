using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Domain.Accounts;

public sealed class Account : OwnableEntity, IShareable
{
    public AccountId Id { get; set; } = AccountId.New();
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Iban { get; set; }
    public AccountType Type { get; set; }
    public Money StartingBalance { get; set; }
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }
}
