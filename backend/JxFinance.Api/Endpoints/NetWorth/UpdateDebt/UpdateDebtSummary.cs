using FastEndpoints;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateDebt;

public sealed class UpdateDebtSummary : Summary<UpdateDebtEndpoint, UpdateDebtRequest>
{
    public UpdateDebtSummary()
    {
        Summary = "Update a debt";
        Description = "Records a new outstanding balance, rate, or name. This is how repayment progress "
            + "is tracked: lower outstandingAmount as the debt is paid down.";
        ExampleRequest = new UpdateDebtRequest(Guid.Empty, "Mortgage", DebtType.Mortgage, "118500.00", 2.4m, new DateOnly(2026, 10, 1));
        Params["id"] = "The debt id. Takes precedence over the id in the body.";
        Responses[200] = "The updated debt.";
        Responses[400] = "Validation failed.";
        Responses[404] = "No such debt belongs to the signed-in user.";
    }
}
