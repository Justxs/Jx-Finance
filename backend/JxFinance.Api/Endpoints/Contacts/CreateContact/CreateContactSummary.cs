using FastEndpoints;

namespace JxFinance.Endpoints.Contacts.CreateContact;

public sealed class CreateContactSummary : Summary<CreateContactEndpoint, CreateContactRequest>
{
    public CreateContactSummary()
    {
        Summary = "Add a person";
        Description = "Adds a person outside the household, such as a friend you lend money to or share a dinner with. "
            + "The person has no login and is visible only to you. Two people may have the same name.";
        ExampleRequest = new CreateContactRequest("Jonas");
        RequestParam(r => r.Name, "The name, 1 to 100 characters.");
        Responses[201] = "The new person, with no balance.";
        Responses[400] = "Validation failed.";
    }
}
