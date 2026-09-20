using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Households.CreateHousehold;

public sealed class CreateHouseholdSummary : Summary<CreateHouseholdEndpoint, CreateHouseholdRequest>
{
    public CreateHouseholdSummary()
    {
        Summary = "Create a household";
        Description = "Creates a household and makes you its owner. A household is the unit that "
            + "shared accounts, categories, and transactions belong to; adding members is what gives "
            + "other people sight of that data.";
        ExampleRequest = new CreateHouseholdRequest("Home");
        Responses[201] = "The household was created. The Location header points at it.";
        Responses[400] = SummaryText.ValidationFailed;
    }
}
