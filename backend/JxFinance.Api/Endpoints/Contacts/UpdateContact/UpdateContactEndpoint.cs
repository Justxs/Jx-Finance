using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.UpdateContact;

public sealed class UpdateContactEndpoint(IContactService contactService) : Endpoint<UpdateContactRequest, ContactResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Contacts + "/{id}");
        Group<ContactsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateContactRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await contactService.RenameAsync(req, ct), ct);
}
