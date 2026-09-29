using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.DeleteSharedExpense;

public sealed class DeleteSharedExpenseSummary : Summary<DeleteSharedExpenseEndpoint>
{
    public DeleteSharedExpenseSummary()
    {
        Summary = "Delete a split";
        Description = "Removes the split from the balances. Only the member who paid can delete it. The "
            + "transaction itself is not touched, and the split is listed in the payer's trash, from where "
            + "POST /api/trash/restore brings it back.";
        Params["id"] = HouseholdSummaryText.Id;
        Params["expenseId"] = "The split id.";
        Responses[204] = "The split is deleted.";
        Responses[403] = "Only the member who paid can delete the split.";
        Responses[404] = "No such split in a household you are a member of.";
    }
}
