using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;

namespace JxFinance.Domain.RecurringBills;

public sealed class RecurringBill : OwnableEntity, IShareable
{
    public RecurringBillId Id { get; set; } = RecurringBillId.New();
    public required string Name { get; set; }
    public RecurringBillShape Shape { get; set; }
    public RecurringBillKind Kind { get; set; }
    public decimal? Amount { get; set; }
    public CategoryId? CategoryId { get; set; }
    public AccountId? AccountId { get; set; }
    public AccountId? ToAccountId { get; set; }
    public RecurringBillCadence Cadence { get; set; }
    public DateOnly NextDueDate { get; set; }
    public int AnchorDay { get; set; }
    public int RemindDaysBefore { get; set; } = 3;
    public bool IsActive { get; set; } = true;
    public string? MatchKey { get; set; }
    public DebtId? DebtId { get; set; }
    public short? SpreadMonths { get; set; }
    public SpreadDirection SpreadDirection { get; set; }
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }

    public void Schedule(DateOnly nextDueDate)
    {
        NextDueDate = nextDueDate;
        AnchorDay = nextDueDate.Day;
    }

    public void Advance() => NextDueDate = Advance(NextDueDate, Cadence, AnchorDay);

    public static DateOnly Advance(DateOnly date, RecurringBillCadence cadence, int anchorDay) => cadence switch
    {
        RecurringBillCadence.Weekly => date.AddDays(7),
        RecurringBillCadence.Monthly => Anchor(date.AddMonths(1), anchorDay),
        RecurringBillCadence.Quarterly => Anchor(date.AddMonths(3), anchorDay),
        RecurringBillCadence.Yearly => Anchor(date.AddYears(1), anchorDay),
        _ => throw new ArgumentOutOfRangeException(nameof(cadence)),
    };

    public static DateOnly Retreat(DateOnly date, RecurringBillCadence cadence, int anchorDay) => cadence switch
    {
        RecurringBillCadence.Weekly => date.AddDays(-7),
        RecurringBillCadence.Monthly => Anchor(date.AddMonths(-1), anchorDay),
        RecurringBillCadence.Quarterly => Anchor(date.AddMonths(-3), anchorDay),
        RecurringBillCadence.Yearly => Anchor(date.AddYears(-1), anchorDay),
        _ => throw new ArgumentOutOfRangeException(nameof(cadence)),
    };

    private static DateOnly Anchor(DateOnly date, int anchorDay) =>
        new(date.Year, date.Month, Math.Clamp(anchorDay, 1, DateTime.DaysInMonth(date.Year, date.Month)));
}
