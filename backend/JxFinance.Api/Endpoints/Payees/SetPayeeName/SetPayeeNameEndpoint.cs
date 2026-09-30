using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Payees.Interfaces;
using JxFinance.Endpoints.Payees.Shared;

namespace JxFinance.Endpoints.Payees.SetPayeeName;

public sealed class SetPayeeNameEndpoint(IPayeeNameService payeeNames) : Endpoint<SetPayeeNameRequest, PayeeNameResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Payees);
        Group<PayeesGroup>();
    }

    public override async Task HandleAsync(SetPayeeNameRequest req, CancellationToken ct) =>
        await Send.OkAsync(await payeeNames.SetAsync(req, ct), ct);
}
