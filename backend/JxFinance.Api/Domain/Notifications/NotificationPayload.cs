using JxFinance.Domain.Budgets;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Domain.Notifications;

public sealed record NotificationPayload
{
    public DateOnly? DueDate { get; init; }

    public int? ThresholdPercent { get; init; }

    public BudgetPeriod? Period { get; init; }

    public RecurringBillShape? Shape { get; init; }
}
