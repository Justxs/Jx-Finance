using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.GetUncategorizedSuggestions;
using JxFinance.Endpoints.Transactions.SuggestCategory;

namespace JxFinance.Endpoints.Transactions.Interfaces;

public interface ICategorySuggestionService
{
    Task<Result<CategorySuggestionResponse>> SuggestAsync(
        SuggestCategoryRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<UncategorizedSuggestionResponse>> SuggestUncategorizedAsync(
        GetUncategorizedSuggestionsRequest request,
        CancellationToken cancellationToken);
}
