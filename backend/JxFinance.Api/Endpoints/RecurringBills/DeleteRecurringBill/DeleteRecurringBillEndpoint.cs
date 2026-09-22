using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.DeleteRecurringBill;

public sealed class DeleteRecurringBillEndpoint(IRecurringBillService recurringBillService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.RecurringBills + "/{id}");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        recurringBillService.DeleteAsync(id, ct);
}
