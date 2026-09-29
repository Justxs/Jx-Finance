using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateSettlement;

public sealed class CreateSettlementSummary : Summary<CreateSettlementEndpoint, CreateSettlementRequest>
{
    public CreateSettlementSummary()
    {
        Summary = "Record that one member paid another";
        Description = "Records a payment between two members, which settles that much of their balance in the "
            + "payment's currency. You must be one of the two. Each must be a member of the household, or a former "
            + "member who still has an open balance there. With transfer, the ordinary transfer from an account "
            + "of the payer to an account of the payee is written in the same database transaction; both accounts "
            + "must be visible to you, owned by the right member and held in the payment's currency. transferId "
            + "links a transfer that already exists instead, under the same checks. Without either, only the "
            + "payment is stored and no account changes.";
        ExampleRequest = new CreateSettlementRequest(
            Guid.Empty,
            Guid.Empty,
            Guid.Empty,
            30.00m,
            Currency.Eur,
            new DateOnly(2026, 9, 29),
            "September groceries");
        Params["id"] = HouseholdSummaryText.Id;
        RequestParam(r => r.Amount, SummaryText.PositiveMoney);
        RequestParam(r => r.Transfer, "Also write a transfer between these two accounts.");
        RequestParam(r => r.TransferId, "Link this existing transfer instead of writing one.");
        Responses[201] = "The recorded payment.";
        Responses[400] = "Validation failed, a party is not a member, or an account is not visible, not owned by "
            + "the right member or in another currency.";
        Responses[403] = "You are neither the payer nor the payee.";
        Responses[404] = HouseholdSummaryText.NotFound;
        Responses[409] = "That transfer already settles another payment.";
    }
}
