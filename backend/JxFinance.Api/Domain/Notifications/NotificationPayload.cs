using JxFinance.Domain.Budgets;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Domain.Notifications;

public sealed record NotificationPayload
{
    public DateOnly? DueDate { get; init; }

    public int? ThresholdPercent { get; init; }

    public BudgetPeriod? Period { get; init; }

    public RecurringBillShape? Shape { get; init; }

    public Guid? TransactionId { get; init; }

    public Guid? BillId { get; init; }

    public string? Amount { get; init; }

    public string? TypicalAmount { get; init; }

    public decimal? Factor { get; init; }

    public int? Count { get; init; }

    public Currency? Currency { get; init; }

    public DateOnly? Month { get; init; }

    public MonthlyDigestPayload? Digest { get; init; }

    public string? Household { get; init; }
}
