using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.RecurringBills.DeleteRecurringBill;

public sealed class DeleteRecurringBillEndpoint(IRecurringBillService recurringBillService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/recurring-bills/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await recurringBillService.DeleteAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
