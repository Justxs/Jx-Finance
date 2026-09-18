using FastEndpoints;

namespace JxFinance.Endpoints.Conversions.GetConversions;

public sealed class GetConversionsSummary : Summary<GetConversionsEndpoint, GetConversionsRequest>
{
    public GetConversionsSummary()
    {
        Summary = "List currency conversions";
        Description = "Pages through conversions on accounts visible to you, newest first. Rate is the "
            + "bought amount divided by the sold amount.";
        RequestParam(r => r.AccountId, "Only conversions on this account.");
        Responses[200] = "A page of conversions.";
    }
}
