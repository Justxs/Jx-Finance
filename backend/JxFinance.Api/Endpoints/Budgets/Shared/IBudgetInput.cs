using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.Shared;

public interface IBudgetInput
{
    Guid CategoryId { get; }
    decimal LimitAmount { get; }
    BudgetPeriod Period { get; }
    bool RolloverEnabled { get; }
}
