using JxFinance.Common.SettleUp;

namespace JxFinance.Endpoints.Budgets.GetBudgets;

public sealed class GetBudgetsRequest
{
    public DateOnly? AsOf { get; init; }

    public SpendingShare? Share { get; init; }
}
