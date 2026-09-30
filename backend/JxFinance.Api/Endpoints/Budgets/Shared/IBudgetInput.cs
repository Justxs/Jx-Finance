using JxFinance.Common.Sharing;
using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.Shared;

public interface IBudgetInput : IShareableInput
{
    Guid? CategoryId { get; }
    Guid? TagId { get; }
    decimal LimitAmount { get; }
    BudgetPeriod Period { get; }
    bool RolloverEnabled { get; }
}
