using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.GetContacts;

public sealed class GetContactsEndpoint(IContactService contactService) : EndpointWithoutRequest<IReadOnlyList<ContactResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Contacts);
        Group<ContactsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await contactService.GetAllAsync(ct), ct);
}
