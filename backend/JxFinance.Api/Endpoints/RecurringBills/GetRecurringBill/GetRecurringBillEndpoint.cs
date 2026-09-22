using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBill;

public sealed class GetRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : EndpointWithoutRequest<RecurringBillResponse, RecurringBillMapper>
{
    public override void Configure()
    {
        Get(ApiRoutes.RecurringBills + "/{id}");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var bill = (await recurringBillService.GetByIdAsync(Route<Guid>("id"), ct)).ValueOrThrow();
        await Send.OkAsync(Map.FromEntity(bill), ct);
    }
}
