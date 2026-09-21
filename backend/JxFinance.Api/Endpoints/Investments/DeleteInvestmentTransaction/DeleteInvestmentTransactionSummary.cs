using FastEndpoints;

namespace JxFinance.Endpoints.Investments.DeleteInvestmentTransaction;

public sealed class DeleteInvestmentTransactionSummary : Summary<DeleteInvestmentTransactionEndpoint>
{
    public DeleteInvestmentTransactionSummary()
    {
        Summary = "Delete an investment transaction";
        Description = "Removes the entry and its cash effect and records it in the trash, so POST "
            + "/api/trash/restore can bring it back for 30 days. A later broker import will not bring a "
            + "deleted imported entry back. A buy or split that later sales depend on is refused.";
        Responses[204] = "Deleted.";
        Responses[400] = "Later sales depend on this buy or split (holding.dependentSales).";
        Responses[404] = "No such entry on an account visible to you.";
    }
}
