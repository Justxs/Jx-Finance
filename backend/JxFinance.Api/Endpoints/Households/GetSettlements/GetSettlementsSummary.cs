using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetSettlements;

public sealed class GetSettlementsSummary : Summary<GetSettlementsEndpoint, GetSettlementsRequest>
{
    public GetSettlementsSummary()
    {
        Summary = "List a household's recorded payments";
        Description = "Returns a page of the payments members recorded to settle up, newest first. hasTransfer "
            + "says whether an ordinary transfer between the two members' accounts was recorded with it.";
        Params["id"] = HouseholdSummaryText.Id;
        this.DescribePaging();
        Responses[200] = "A page of payments with the total row count.";
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
