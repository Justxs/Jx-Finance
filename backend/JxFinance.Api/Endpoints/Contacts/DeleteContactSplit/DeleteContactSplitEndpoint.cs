using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Contacts.Interfaces;

namespace JxFinance.Endpoints.Contacts.DeleteContactSplit;

public sealed class DeleteContactSplitEndpoint(IContactService contactService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Contacts + "/splits/{id}");
        Group<ContactsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) => contactService.DeleteSplitAsync(id, ct);
}
