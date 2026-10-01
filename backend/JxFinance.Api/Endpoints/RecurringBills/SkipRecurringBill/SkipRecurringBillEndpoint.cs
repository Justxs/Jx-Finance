using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.SkipRecurringBill;

public sealed class SkipRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<SkipRecurringBillRequest, RecurringBillResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.RecurringBills + "/{id}/skip");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(SkipRecurringBillRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await recurringBillService.SkipAsync(req, ct), ct);
}
