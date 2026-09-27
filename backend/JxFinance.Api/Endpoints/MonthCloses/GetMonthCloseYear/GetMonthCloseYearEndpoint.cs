using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.MonthCloses.Interfaces;
using JxFinance.Endpoints.MonthCloses.Shared;

namespace JxFinance.Endpoints.MonthCloses.GetMonthCloseYear;

public sealed class GetMonthCloseYearEndpoint(IMonthCloseService monthCloseService)
    : Endpoint<GetMonthCloseYearRequest, MonthCloseYearResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.MonthClose);
        Group<MonthClosesGroup>();
    }

    public override async Task HandleAsync(GetMonthCloseYearRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await monthCloseService.GetYearAsync(req.Year, ct), ct);
}
