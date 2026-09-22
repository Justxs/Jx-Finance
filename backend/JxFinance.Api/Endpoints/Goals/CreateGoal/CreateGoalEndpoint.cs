using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalEndpoint(IGoalService goalService) : Endpoint<CreateGoalRequest, GoalResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Goals);
        Group<GoalsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<GoalResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateGoalRequest req, CancellationToken ct)
    {
        var goal = (await goalService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.GoalsPath}/{goal.Id}", goal));
    }
}
