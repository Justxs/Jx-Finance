using FastEndpoints;

namespace JxFinance.Endpoints.Investments.DeleteInvestmentTransaction;

public sealed class DeleteInvestmentTransactionSummary : Summary<DeleteInvestmentTransactionEndpoint>
{
    public DeleteInvestmentTransactionSummary()
    {
        Summary = "Delete an investment transaction";
        Description = "Removes the entry and its cash effect. A later broker import will not bring a deleted imported entry back.";
        Responses[204] = "Deleted.";
        Responses[404] = "No such entry on an account visible to you.";
    }
}
