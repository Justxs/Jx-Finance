using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.MonthCloses.GetMonthReview;
using JxFinance.Endpoints.MonthCloses.Interfaces;

namespace JxFinance.Endpoints.MonthCloses.ReopenMonth;

public sealed class ReopenMonthEndpoint(IMonthCloseService monthCloseService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete(GetMonthReviewEndpoint.Route);
        Group<MonthClosesGroup>();
        Description(d => d.Produces(204));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await monthCloseService.ReopenAsync(Route<string>("month")!, ct), ct);
}
