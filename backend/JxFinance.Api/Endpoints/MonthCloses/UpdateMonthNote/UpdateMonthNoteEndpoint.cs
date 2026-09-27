using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.MonthCloses.GetMonthReview;
using JxFinance.Endpoints.MonthCloses.Interfaces;
using JxFinance.Endpoints.MonthCloses.Shared;

namespace JxFinance.Endpoints.MonthCloses.UpdateMonthNote;

public sealed class UpdateMonthNoteEndpoint(IMonthCloseService monthCloseService)
    : Endpoint<UpdateMonthNoteRequest, MonthReviewResponse>
{
    public override void Configure()
    {
        Put(GetMonthReviewEndpoint.Route + "/note");
        Group<MonthClosesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateMonthNoteRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await monthCloseService.UpdateNoteAsync(Route<string>("month")!, req.Note, ct), ct);
}
