using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.KeepPossibleDuplicates;

public sealed class KeepPossibleDuplicatesSummary : Summary<KeepPossibleDuplicatesEndpoint>
{
    public KeepPossibleDuplicatesSummary()
    {
        Summary = "Keep a transaction and its possible duplicates";
        Description = "Answers \"keep both\" for every pair the duplicates=true filter currently finds with this "
            + "transaction: each pair is stored and never offered again, so both rows leave the filter unless one of "
            + "them still pairs with a third row. Changes neither transaction. To remove the extra row instead, "
            + "delete it through DELETE /api/transactions/{id}. A transaction without a possible duplicate answers "
            + "204 and stores nothing.";
        Params["id"] = "The transaction id.";
        Responses[204] = "Every current pair of the transaction is kept.";
        Responses[404] = "No such transaction is visible to the signed-in user.";
    }
}
