using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBill;

public sealed class GetRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : EndpointWithoutRequest<RecurringBillResponse>
{
    public override void Configure()
    {
        Get("recurring-bills/{id}");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var bill = (await recurringBillService.GetByIdAsync(Route<Guid>("id"), ct)).ValueOrThrow();
        await Send.OkAsync(bill, ct);
    }
}
