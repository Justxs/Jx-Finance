using FastEndpoints;

namespace JxFinance.Endpoints.Categories.GetCategories;

public sealed class GetCategoriesSummary : Summary<GetCategoriesEndpoint>
{
    public GetCategoriesSummary()
    {
        Summary = "List categories";
        Description = "Returns your personal categories plus the shared categories of the households "
            + "you belong to. Each one carries its flow type, so the client can offer income categories "
            + "and expense categories separately.";
        Responses[200] = "The categories visible to the signed-in user.";
    }
}
