using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.CreateContactSplit;

public sealed class CreateContactSplitEndpoint(IContactService contactService)
    : Endpoint<CreateContactSplitRequest, ContactSplitResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Contacts + "/splits");
        Group<ContactsGroup>();
        Description(d => d.ProducesCreated<ContactSplitResponse>().ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateContactSplitRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await contactService.CreateSplitAsync(req, ct), split => split.Id, ct);
}
