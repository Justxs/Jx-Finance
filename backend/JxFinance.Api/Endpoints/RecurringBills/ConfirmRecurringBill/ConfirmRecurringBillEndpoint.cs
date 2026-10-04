using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed class ConfirmRecurringBillEndpoint(IRecurringBillOccurrenceService occurrences)
    : Endpoint<ConfirmRecurringBillRequest, ConfirmRecurringBillResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.RecurringBills + "/{id}/confirm");
        Group<RecurringBillsGroup>();
        Metadata(TokenWritable.Yes);
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(ConfirmRecurringBillRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await occurrences.ConfirmAsync(req, ct), ct);
}
