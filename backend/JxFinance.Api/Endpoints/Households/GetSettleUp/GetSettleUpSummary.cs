using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetSettleUp;

public sealed class GetSettleUpSummary : Summary<GetSettleUpEndpoint>
{
    public GetSettleUpSummary()
    {
        Summary = "Who owes whom in a household";
        Description = "Returns each member's open balance per currency and the fewest payments that would settle "
            + "them. A positive balance is owed to the member, a negative one is owed by them. A balance is what "
            + "the member paid for others in splits, minus what others paid for them, plus the payments they made, "
            + "minus the payments they received. A split whose transaction is deleted stops counting until the "
            + "transaction is restored. Currencies are never converted. A former member with an open balance is "
            + "still listed. Nothing here enters reports, budgets or net worth.";
        Params["id"] = HouseholdSummaryText.Id;
        Responses[200] = "The non-zero balances and the suggested payments.";
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
