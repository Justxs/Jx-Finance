using FastEndpoints;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.UpdateInvestmentTransaction;

public sealed class UpdateInvestmentTransactionSummary
    : Summary<UpdateInvestmentTransactionEndpoint, UpdateInvestmentTransactionRequest>
{
    public UpdateInvestmentTransactionSummary()
    {
        Summary = "Correct an investment transaction";
        Description = "Replaces every field of an entry that was recorded by hand, under the same rules as recording "
            + "one. Entries imported from a broker are corrected at the broker and imported again. A correction that "
            + "would leave a later sale without enough shares is refused.";
        ExampleRequest = new UpdateInvestmentTransactionRequest(
            Guid.Empty,
            Guid.Empty,
            InvestmentTransactionType.Buy,
            new DateOnly(2026, 9, 12),
            Guid.Empty,
            "10",
            "104.52",
            Fee: "1.25");
        RequestParam(r => r.Quantity, "Shares for a buy or sell; new shares per old share for a split.");
        RequestParam(r => r.Amount, "Cash amount for dividend, withholding tax, interest and fee entries.");
        RequestParam(r => r.Currency, "Currency for entries without a security. Defaults to the security's currency, then the account's.");
        Responses[200] = "The entry was corrected.";
        Responses[400] = "Validation failed, the entry was imported, the account or security is unknown, or no exchange rate exists for the date.";
        Responses[404] = "The entry does not exist.";
    }
}
