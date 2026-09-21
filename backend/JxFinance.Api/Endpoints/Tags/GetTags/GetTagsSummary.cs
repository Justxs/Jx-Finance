using FastEndpoints;

namespace JxFinance.Endpoints.Tags.GetTags;

public sealed class GetTagsSummary : Summary<GetTagsEndpoint>
{
    public GetTagsSummary()
    {
        Summary = "List tags";
        Description = "Returns your personal tags plus the shared tags of the households you belong to, "
            + "by name. A tag has no flow type, so the same list serves income and expense. While a "
            + "household is active, the tags of the other households are left out, exactly as categories "
            + "are.";
        Responses[200] = "The tags visible to the signed-in user.";
    }
}
