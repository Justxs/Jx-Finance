using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.SuggestCategory;

public sealed class SuggestCategoryEndpoint(ICategorySuggestionService suggestions)
    : Endpoint<SuggestCategoryRequest, CategorySuggestionResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/suggest-category");
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(new RequiresFeature(Feature.LearnedCategories)));
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(SuggestCategoryRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await suggestions.SuggestAsync(req, ct), ct);
}
