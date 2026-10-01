using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.GetContactEntries;

public sealed class GetContactEntriesEndpoint(IContactService contactService)
    : Endpoint<GetContactEntriesRequest, PagedResponse<ContactEntryResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Contacts + "/{id}/entries");
        Group<ContactsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetContactEntriesRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await contactService.GetEntriesAsync(req, ct), ct);
}
