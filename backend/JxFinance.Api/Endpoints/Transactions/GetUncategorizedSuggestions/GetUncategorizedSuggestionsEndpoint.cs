using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.GetUncategorizedSuggestions;

public sealed class GetUncategorizedSuggestionsEndpoint(ICategorySuggestionService suggestions)
    : Endpoint<GetUncategorizedSuggestionsRequest, IReadOnlyList<UncategorizedSuggestionResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/uncategorized-suggestions");
        Group<TransactionsGroup>();
        Metadata(new RequiresFeature(Feature.LearnedCategories));
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetUncategorizedSuggestionsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await suggestions.SuggestUncategorizedAsync(req, ct), ct);
}
