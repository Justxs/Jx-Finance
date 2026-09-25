using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<CreateRecurringBillRequest, RecurringBillResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.RecurringBills);
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesCreated<RecurringBillResponse>());
    }

    public override async Task HandleAsync(CreateRecurringBillRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await recurringBillService.CreateAsync(req, ct), bill => $"{ApiRoutes.RecurringBillsPath}/{bill.Id}", ct);
}
