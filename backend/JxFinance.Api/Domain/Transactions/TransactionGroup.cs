using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Domain.Transactions;

public sealed class TransactionGroup : OwnableEntity, IShareable
{
    public const int NameMaxLength = 120;

    public TransactionGroupId Id { get; set; } = TransactionGroupId.New();
    public required string Name { get; set; }
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }
}
