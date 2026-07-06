using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.RecurringBills;

public sealed class RecurringBill : OwnableEntity
{
    public RecurringBillId Id { get; set; } = RecurringBillId.New();
    public required string Name { get; set; }
    public RecurringBillKind Kind { get; set; }
    public Money? Amount { get; set; }
    public CategoryId? CategoryId { get; set; }
    public AccountId? AccountId { get; set; }
    public RecurringBillCadence Cadence { get; set; }
    public DateOnly NextDueDate { get; set; }
    public int RemindDaysBefore { get; set; } = 3;
    public bool IsActive { get; set; } = true;

    public static DateOnly Advance(DateOnly date, RecurringBillCadence cadence) => cadence switch
    {
        RecurringBillCadence.Weekly => date.AddDays(7),
        RecurringBillCadence.Monthly => date.AddMonths(1),
        RecurringBillCadence.Quarterly => date.AddMonths(3),
        RecurringBillCadence.Yearly => date.AddYears(1),
        _ => throw new ArgumentOutOfRangeException(nameof(cadence)),
    };
}
