using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.UpdateDebt;

public sealed class UpdateDebtSummary : Summary<UpdateDebtEndpoint, UpdateDebtRequest>
{
    public UpdateDebtSummary()
    {
        Summary = "Update a debt";
        Description = "Records a new outstanding balance, rate, name or repayment terms. This is how repayment progress "
            + "is tracked: lower outstandingAmount as the debt is paid down. The request replaces the debt, so repayment "
            + "terms left out are cleared.";
        ExampleRequest = new UpdateDebtRequest(
            Guid.Empty,
            "Mortgage",
            DebtType.Mortgage,
            118500.00m,
            2.4m,
            new DateOnly(2026, 10, 1),
            150000.00m,
            new DateOnly(2020, 10, 15),
            360,
            null,
            AmortizationType.Annuity);
        Params["id"] = "The debt id. Takes precedence over the id in the body.";
        this.DescribeDebtSchedule();
        Responses[200] = "The updated debt.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = "No such debt belongs to the signed-in user.";
    }
}
