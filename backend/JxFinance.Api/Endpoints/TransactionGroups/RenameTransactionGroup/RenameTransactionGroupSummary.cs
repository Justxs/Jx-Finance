using FastEndpoints;

namespace JxFinance.Endpoints.TransactionGroups.RenameTransactionGroup;

public sealed class RenameTransactionGroupSummary : Summary<RenameTransactionGroupEndpoint, RenameTransactionGroupRequest>
{
    public RenameTransactionGroupSummary()
    {
        Summary = "Rename a transaction group";
        Description = "Changes the name of one of your groups. Its members are untouched.";
        ExampleRequest = new RenameTransactionGroupRequest(Guid.Empty, "Trip to Riga");
        Params["id"] = "The group id. Takes precedence over the id in the body.";
        RequestParam(r => r.Name, "The new name, 1 to 120 characters.");
        Responses[200] = "The renamed group.";
        Responses[400] = "Validation failed.";
        Responses[404] = "You have no such group.";
    }
}
