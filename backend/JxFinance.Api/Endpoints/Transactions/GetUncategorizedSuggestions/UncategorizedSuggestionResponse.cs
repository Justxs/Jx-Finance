using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetUncategorizedSuggestions;

public sealed record UncategorizedSuggestionResponse(
    TransactionResponse Transaction,
    Guid CategoryId,
    CategorySuggestionSource Source,
    string? RuleName,
    decimal? Confidence);
