using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.MonthCloses.GetMonthReview;
using JxFinance.Endpoints.MonthCloses.Interfaces;
using JxFinance.Endpoints.MonthCloses.Shared;

namespace JxFinance.Endpoints.MonthCloses.CloseMonth;

public sealed class CloseMonthEndpoint(IMonthCloseService monthCloseService)
    : Endpoint<CloseMonthRequest, MonthReviewResponse>
{
    public override void Configure()
    {
        Post(GetMonthReviewEndpoint.Route);
        Group<MonthClosesGroup>();
        Description(d => d.ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CloseMonthRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await monthCloseService.CloseAsync(Route<string>("month")!, req.Note, ct), ct);
}
