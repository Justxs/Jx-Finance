using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.GetTransaction;

public sealed class GetTransactionSummary : Summary<GetTransactionEndpoint>
{
    public GetTransactionSummary()
    {
        Summary = "Get one transaction";
        Description = "Returns a single transaction, including its split lines when it has any. A "
            + "transaction you cannot see is reported as missing rather than forbidden.";
        Params["id"] = "The transaction id.";
        Responses[200] = "The transaction.";
        Responses[404] = "No such transaction is visible to the signed-in user.";
    }
}
