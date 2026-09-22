using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.GetRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<CreateRecurringBillRequest, RecurringBillResponse, RecurringBillMapper>
{
    public override void Configure()
    {
        Post(ApiRoutes.RecurringBills);
        Group<RecurringBillsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<RecurringBillResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateRecurringBillRequest req, CancellationToken ct)
    {
        var bill = Map.FromEntity((await recurringBillService.CreateAsync(Map.ToEntity(req), ct)).ValueOrThrow());
        await Send.CreatedAtAsync<GetRecurringBillEndpoint>(new { id = bill.Id }, bill, cancellation: ct);
    }
}
