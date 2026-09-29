using JxFinance.Domain.Common;
using JxFinance.Domain.Transfers;

namespace JxFinance.Domain.Households;

public sealed class Settlement : OwnableEntity, IHouseholdScoped
{
    public const int NoteMaxLength = 200;

    public SettlementId Id { get; set; } = SettlementId.New();
    public HouseholdId HouseholdId { get; set; }
    public Guid FromUserId { get; set; }
    public Guid ToUserId { get; set; }
    public Money Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Note { get; set; }
    public TransferId? TransferId { get; set; }
}
