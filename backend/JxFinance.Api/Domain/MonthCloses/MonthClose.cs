using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Domain.MonthCloses;

public sealed class MonthClose : OwnableEntity
{
    public const int NoteMaxLength = 1000;

    public MonthCloseId Id { get; set; } = MonthCloseId.New();
    public DateOnly Month { get; set; }
    public HouseholdId? HouseholdId { get; set; }
    public DateTimeOffset ClosedAt { get; set; }
    public string? Note { get; set; }
    public required MonthCloseSnapshot Snapshot { get; set; }
}
