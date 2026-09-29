using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.UpdateSharedExpense;

public sealed class UpdateSharedExpenseSummary : Summary<UpdateSharedExpenseEndpoint, UpdateSharedExpenseRequest>
{
    public UpdateSharedExpenseSummary()
    {
        Summary = "Change a split";
        Description = "Replaces the members and their amounts. Only the member who paid can change it. With "
            + "refreshFromTransaction the split first copies the transaction's current amount, date and "
            + "description, which is how a split follows a corrected transaction; otherwise it keeps its copy.";
        Params["id"] = HouseholdSummaryText.Id;
        Params["expenseId"] = "The split id.";
        RequestParam(r => r.RefreshFromTransaction, "Copy the transaction's current amount, date and description first.");
        Responses[200] = "The split as it is now.";
        Responses[400] = "Validation failed, a member is not in the household, nobody but you takes part, the exact "
            + "amounts do not add up, or the transaction is no longer visible.";
        Responses[403] = "Only the member who paid can change the split.";
        Responses[404] = "No such split in a household you are a member of.";
    }
}
