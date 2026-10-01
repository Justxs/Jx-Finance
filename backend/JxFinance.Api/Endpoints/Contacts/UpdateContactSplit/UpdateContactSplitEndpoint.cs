using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.UpdateContactSplit;

public sealed class UpdateContactSplitEndpoint(IContactService contactService)
    : Endpoint<UpdateContactSplitRequest, ContactSplitResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Contacts + "/splits/{id}");
        Group<ContactsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateContactSplitRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await contactService.UpdateSplitAsync(req, ct), ct);
}
