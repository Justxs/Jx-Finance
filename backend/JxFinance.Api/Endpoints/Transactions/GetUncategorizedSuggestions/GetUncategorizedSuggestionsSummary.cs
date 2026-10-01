using FastEndpoints;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetUncategorizedSuggestions;

public sealed class GetUncategorizedSuggestionsSummary
    : Summary<GetUncategorizedSuggestionsEndpoint, GetUncategorizedSuggestionsRequest>
{
    public GetUncategorizedSuggestionsSummary()
    {
        Summary = "Suggest categories for uncategorized transactions";
        Description = "Takes the newest 200 transactions that match the filters, have no category and are not split, "
            + "and suggests a category for each: the first matching categorization rule while the categorizationRules "
            + "feature is on, otherwise a naive Bayes model trained inside the API on the categorized transactions you can "
            + "see, when it is sure enough. Only transactions that got a suggestion are answered, each with the "
            + "transaction itself, the category, the source and the rule's name or the model's confidence. Nothing is "
            + "written: apply a suggestion through POST /api/transactions/bulk-category with onlyUncategorized. "
            + "Needs the learnedCategories feature.";
        this.DescribeTransactionFilter();
        Responses[200] = "The suggestions, newest transaction first.";
        Responses[404] = "The learnedCategories feature is switched off (feature.disabled).";
    }
}
