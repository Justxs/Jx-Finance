using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.GetBillsCalendar;

public sealed class GetBillsCalendarEndpoint(IRecurringBillScheduleService schedule)
    : Endpoint<GetBillsCalendarRequest, BillsCalendarResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.RecurringBills + "/calendar");
        Group<RecurringBillsGroup>();
    }

    public override async Task HandleAsync(GetBillsCalendarRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await schedule.GetCalendarAsync(req.Month, ct), ct);
}
