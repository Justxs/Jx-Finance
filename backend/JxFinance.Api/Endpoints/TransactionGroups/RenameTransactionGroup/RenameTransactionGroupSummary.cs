using FastEndpoints;

namespace JxFinance.Endpoints.TransactionGroups.RenameTransactionGroup;

public sealed class RenameTransactionGroupSummary : Summary<RenameTransactionGroupEndpoint, RenameTransactionGroupRequest>
{
    public RenameTransactionGroupSummary()
    {
        Summary = "Rename or share a transaction group";
        Description = "Changes the name of a group you can see, and its owner can share it with a household or make it personal "
            + "again. Any member of the household can rename a shared group. Sharing needs every member on an account shared "
            + "with that household; making a shared group personal takes out the transactions other people entered.";
        ExampleRequest = new RenameTransactionGroupRequest(Guid.Empty, "Trip to Riga");
        Params["id"] = "The group id. Takes precedence over the id in the body.";
        RequestParam(r => r.Name, "The new name, 1 to 120 characters.");
        RequestParam(r => r.Scope, "personal (the default) or shared; send the group's current scope to keep it.");
        RequestParam(r => r.HouseholdId, "The household a shared group belongs to; required when the scope is shared.");
        Responses[200] = "The renamed group.";
        Responses[400] = "Validation failed, or a member is on an account not shared with the household.";
        Responses[403] = "Only the owner can change how a group is shared, or you are not a member of the household.";
        Responses[404] = "You have no such group.";
    }
}
