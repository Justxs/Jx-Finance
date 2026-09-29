using FastEndpoints;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateSharedExpense;

public sealed class CreateSharedExpenseSummary : Summary<CreateSharedExpenseEndpoint, CreateSharedExpenseRequest>
{
    public CreateSharedExpenseSummary()
    {
        Summary = "Split an expense with the household";
        Description = "Splits an expense you paid from one of your own accounts between members of the household. "
            + "The split keeps a copy of the transaction's date, description and amount, which is what the other "
            + "members see, even when the account is personal and they cannot see the transaction itself. Each "
            + "member's amount is computed once, now, and stored: Equal divides the amount evenly, Shares by whole "
            + "weights from 1 to 100, and Exact takes the amounts given, which must add up to the expense. Cents "
            + "left over by a division go to the largest remainders, ties in the order the members are listed, so "
            + "the shares always add up to the amount. A transaction can be split once. Income, transfers, "
            + "refunds and a housemate's payment on a shared account cannot be split.";
        ExampleRequest = new CreateSharedExpenseRequest(
            Guid.Empty,
            Guid.Empty,
            SplitMethod.Shares,
            [new ShareRequest(Guid.Empty, 2), new ShareRequest(Guid.Empty, 1)]);
        Params["id"] = HouseholdSummaryText.Id;
        RequestParam(r => r.TransactionId, "The expense to split. It must be on an account you own.");
        RequestParam(r => r.Method, "Equal, Shares or Exact.");
        RequestParam(
            r => r.Shares,
            "One entry per member taking part, the payer included when they keep a share: a weight for Shares, an amount for Exact.");
        Responses[201] = "The split, with every member's amount.";
        Responses[400] = "Validation failed, the transaction is not visible, not yours or not an expense, a member is "
            + "not in the household, nobody but you takes part, or the exact amounts do not add up.";
        Responses[404] = HouseholdSummaryText.NotFound;
        Responses[409] = "The transaction is already split.";
    }
}
