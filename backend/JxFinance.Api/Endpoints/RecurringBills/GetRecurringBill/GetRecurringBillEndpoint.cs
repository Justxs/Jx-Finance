using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBill;

public sealed class GetRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : EndpointWithoutRequest<RecurringBillResponse>
{
    public override void Configure()
    {
        Get("/api/recurring-bills/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await recurringBillService.GetByIdAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
