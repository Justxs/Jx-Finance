using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetSharedExpenses;

public sealed class GetSharedExpensesSummary : Summary<GetSharedExpensesEndpoint, GetSharedExpensesRequest>
{
    public GetSharedExpensesSummary()
    {
        Summary = "List a household's split expenses";
        Description = "Returns a page of the household's splits, newest first, with the payer, the copied date, "
            + "description and amount, every member's share and your own. counted is false while the split's "
            + "transaction is deleted. transactionId and amountDiffers are filled only for the member who paid, "
            + "because the transaction may sit on an account the others cannot see.";
        Params["id"] = HouseholdSummaryText.Id;
        this.DescribePaging();
        Responses[200] = "A page of splits with the total row count.";
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
