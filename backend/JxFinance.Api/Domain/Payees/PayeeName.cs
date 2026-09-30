using JxFinance.Domain.Common;

namespace JxFinance.Domain.Payees;

public sealed class PayeeName : OwnableEntity
{
    public const int NameMaxLength = 100;

    public PayeeNameId Id { get; set; } = PayeeNameId.New();
    public required string PayeeKey { get; set; }
    public required string Name { get; set; }
}
