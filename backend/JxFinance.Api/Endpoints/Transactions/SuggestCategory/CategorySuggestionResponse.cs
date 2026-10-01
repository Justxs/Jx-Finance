using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.SuggestCategory;

public sealed record CategorySuggestionResponse(
    Guid? CategoryId,
    CategorySuggestionSource? Source,
    string? RuleName,
    decimal? Confidence)
{
    public static readonly CategorySuggestionResponse None = new(null, null, null, null);
}
