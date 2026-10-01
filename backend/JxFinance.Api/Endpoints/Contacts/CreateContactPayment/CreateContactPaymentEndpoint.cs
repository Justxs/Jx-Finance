using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.CreateContactPayment;

public sealed class CreateContactPaymentEndpoint(IContactService contactService)
    : Endpoint<CreateContactPaymentRequest, ContactEntryResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Contacts + "/{id}/payments");
        Group<ContactsGroup>();
        Description(d => d.ProducesCreated<ContactEntryResponse>().ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CreateContactPaymentRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(
            await contactService.CreatePaymentAsync(req, ct),
            payment => $"{ApiRoutes.ContactsPath}/payments/{payment.Id}",
            ct);
}
