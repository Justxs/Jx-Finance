using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Payees.Interfaces;

namespace JxFinance.Endpoints.Payees.DeletePayeeName;

public sealed class DeletePayeeNameEndpoint(IPayeeNameService payeeNames) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Payees + "/{id}");
        Group<PayeesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        payeeNames.DeleteAsync(id, ct);
}
