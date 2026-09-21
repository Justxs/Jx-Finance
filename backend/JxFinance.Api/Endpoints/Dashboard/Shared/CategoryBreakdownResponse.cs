using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Dashboard.Shared;

public enum SyntheticCategoryGroup
{
    InvestmentIncome,
    InvestmentTaxesAndFees,
}

public sealed record CategoryBreakdownItem(
    Guid? CategoryId,
    string CategoryName,
    string? CategoryIcon,
    [property: Money] decimal Amount,
    SyntheticCategoryGroup? SyntheticGroup = null,
    [property: Money] decimal? ComparisonAmount = null);

public sealed record CategoryBreakdownResponse(
    IReadOnlyList<CategoryBreakdownItem> Items,
    DateOnly PeriodStart,
    DateOnly PeriodEnd);
