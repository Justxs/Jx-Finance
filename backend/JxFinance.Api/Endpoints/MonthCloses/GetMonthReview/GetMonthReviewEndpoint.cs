using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.MonthCloses.Interfaces;
using JxFinance.Endpoints.MonthCloses.Shared;

namespace JxFinance.Endpoints.MonthCloses.GetMonthReview;

public sealed class GetMonthReviewEndpoint(IMonthCloseService monthCloseService)
    : EndpointWithoutRequest<MonthReviewResponse>
{
    public const string Route = ApiRoutes.MonthClose + "/{month}";

    public override void Configure()
    {
        Get(Route);
        Group<MonthClosesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await monthCloseService.GetMonthAsync(Route<string>("month")!, ct), ct);
}
