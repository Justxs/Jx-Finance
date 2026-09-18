using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<UpdateRecurringBillRequest, RecurringBillResponse, RecurringBillMapper>
{
    public override void Configure()
    {
        Put("recurring-bills/{id}");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateRecurringBillRequest req, CancellationToken ct)
    {
        var bill = (await recurringBillService.UpdateAsync(req.Id, entity => Map.UpdateEntity(req, entity), ct)).ValueOrThrow();
        await Send.OkAsync(Map.FromEntity(bill), ct);
    }
}
