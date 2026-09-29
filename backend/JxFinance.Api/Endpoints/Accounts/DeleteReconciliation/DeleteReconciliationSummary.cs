using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.DeleteReconciliation;

public sealed class DeleteReconciliationSummary : Summary<DeleteReconciliationEndpoint, DeleteReconciliationRequest>
{
    public DeleteReconciliationSummary()
    {
        Summary = "Delete a reconciliation of an account";
        Description = "Removes a recorded statement balance for good. It does not go to the trash and is not audited, "
            + "because it moves no money and can be typed again.";
        Params["id"] = "The account id.";
        Params["reconciliationId"] = "The reconciliation id.";
        Responses[204] = "Deleted.";
        Responses[404] = "No such reconciliation is recorded on an account visible to the signed-in user.";
    }
}
