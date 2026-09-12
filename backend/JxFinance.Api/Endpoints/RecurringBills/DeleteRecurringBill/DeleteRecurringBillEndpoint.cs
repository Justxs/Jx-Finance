using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.DeleteRecurringBill;

public sealed class DeleteRecurringBillEndpoint(IRecurringBillService recurringBillService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("recurring-bills/{id}");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await recurringBillService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
