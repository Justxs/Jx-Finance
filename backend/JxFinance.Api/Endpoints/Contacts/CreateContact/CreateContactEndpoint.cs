using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.CreateContact;

public sealed class CreateContactEndpoint(IContactService contactService) : Endpoint<CreateContactRequest, ContactResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Contacts);
        Group<ContactsGroup>();
        Description(d => d.ProducesCreated<ContactResponse>());
    }

    public override async Task HandleAsync(CreateContactRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await contactService.CreateAsync(req, ct), contact => contact.Id, ct);
}
