using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.GetRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<CreateRecurringBillRequest, RecurringBillResponse>
{
    public override void Configure()
    {
        Post("recurring-bills");
        Group<RecurringBillsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<RecurringBillResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateRecurringBillRequest req, CancellationToken ct)
    {
        var bill = (await recurringBillService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.CreatedAtAsync<GetRecurringBillEndpoint>(new { id = bill.Id }, bill, cancellation: ct);
    }
}
