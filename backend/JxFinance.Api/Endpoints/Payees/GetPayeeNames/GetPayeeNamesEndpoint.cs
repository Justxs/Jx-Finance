using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Payees.Interfaces;
using JxFinance.Endpoints.Payees.Shared;

namespace JxFinance.Endpoints.Payees.GetPayeeNames;

public sealed class GetPayeeNamesEndpoint(IPayeeNameService payeeNames)
    : EndpointWithoutRequest<IReadOnlyList<PayeeNameResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Payees);
        Group<PayeesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await payeeNames.GetAllAsync(ct), ct);
}
