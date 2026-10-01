using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Contacts.Interfaces;

namespace JxFinance.Endpoints.Contacts.DeleteContactPayment;

public sealed class DeleteContactPaymentEndpoint(IContactService contactService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Contacts + "/payments/{id}");
        Group<ContactsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) => contactService.DeletePaymentAsync(id, ct);
}
