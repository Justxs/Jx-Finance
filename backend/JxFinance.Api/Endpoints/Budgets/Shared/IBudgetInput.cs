namespace JxFinance.Endpoints.Budgets.Shared;

public interface IBudgetInput
{
    Guid CategoryId { get; }
    decimal LimitAmount { get; }
}
