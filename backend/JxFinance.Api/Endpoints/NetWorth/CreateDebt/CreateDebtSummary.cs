using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed class CreateDebtSummary : Summary<CreateDebtEndpoint, CreateDebtRequest>
{
    public CreateDebtSummary()
    {
        Summary = "Add a debt";
        Description = "Starts tracking money owed. The outstanding amount is subtracted from net worth "
            + "from the as-of date onwards.";
        ExampleRequest = new CreateDebtRequest("Mortgage", DebtType.Mortgage, 120000.00m, 2.4m, new DateOnly(2026, 9, 1));
        RequestParam(r => r.Type, "Mortgage, Loan, or Other.");
        RequestParam(r => r.OutstandingAmount, "Decimal string with at most two decimal places.");
        RequestParam(r => r.InterestRate, "Optional annual rate as a percentage, for example 2.4.");
        RequestParam(r => r.AsOf, "The date the balance is good for, as YYYY-MM-DD.");
        Responses[201] = "The debt was created. The Location header points at it.";
        Responses[400] = SummaryText.ValidationFailed;
    }
}
