using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateSharedExpense;

public sealed class CreateSharedExpenseEndpoint(ISettleUpService settleUpService)
    : Endpoint<CreateSharedExpenseRequest, SharedExpenseResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Households + "/{id}/shared-expenses");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesCreated<SharedExpenseResponse>().ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateSharedExpenseRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(
            await settleUpService.CreateSharedExpenseAsync(req, ct),
            expense => expense.Id,
            ct);
}
