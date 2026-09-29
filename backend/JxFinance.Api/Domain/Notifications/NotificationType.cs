namespace JxFinance.Domain.Notifications;

public enum NotificationType
{
    BillDue,
    BudgetWarning,
    BudgetExceeded,
    UnusualAmount,
    UnusualAmounts,
    RecurringPriceRise,
    MonthReadyToClose,
    MonthlyDigest,
}
