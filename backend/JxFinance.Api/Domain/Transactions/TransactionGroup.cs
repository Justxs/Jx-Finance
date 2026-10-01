using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public sealed class TransactionGroup : OwnableEntity
{
    public const int NameMaxLength = 120;

    public TransactionGroupId Id { get; set; } = TransactionGroupId.New();
    public required string Name { get; set; }
}
