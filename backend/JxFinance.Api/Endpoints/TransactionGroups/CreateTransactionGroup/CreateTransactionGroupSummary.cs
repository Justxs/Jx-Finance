using FastEndpoints;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.TransactionGroups.CreateTransactionGroup;

public sealed class CreateTransactionGroupSummary : Summary<CreateTransactionGroupEndpoint, CreateTransactionGroupRequest>
{
    public CreateTransactionGroupSummary()
    {
        Summary = "Group transactions";
        Description = "Creates a personal group, such as \"Trip to Riga\", and puts the listed transactions in it, so that "
            + "GET /api/transactions/ledger folds them into one item. Grouping changes only how the ledger reads: every member "
            + "keeps its own date, category and amount in reports, budgets, balances, the month close and the exports, and "
            + "the member's last-updated time is left as it was. Every transaction must be one you entered, and none may "
            + "already be in another group; remove it from that group first. Names need not be unique. The ledger offers "
            + "grouping for two or more selected rows, while a row's own actions start a group with that row alone. Only a "
            + "browser session can group; a personal API token cannot.";
        ExampleRequest = new CreateTransactionGroupRequest("Trip to Riga", [Guid.Empty, Guid.Empty]);
        RequestParam(r => r.Name, "The group's name, 1 to 120 characters.");
        RequestParam(r => r.TransactionIds, $"The transactions to group, 1 to {BulkRules.MaxTransactions}.");
        Responses[201] = "The group was created. The Location header points at it.";
        Responses[400] = "Validation failed.";
        Responses[403] = "A transaction was entered by someone else, such as a housemate on a shared account.";
        Responses[404] = "A transaction is not visible to you.";
        Responses[409] = "A transaction is already in another group.";
    }
}
