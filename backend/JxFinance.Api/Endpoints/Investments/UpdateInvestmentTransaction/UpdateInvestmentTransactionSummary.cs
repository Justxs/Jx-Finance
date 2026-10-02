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
            + "one. Entries imported from a broker are corrected at the broker and imported again, except that the "
            + "CostShare of an imported spin-off or merger paid in shares and cash can be set here; the rest of the body is then "
            + "ignored. A correction that would leave a later sale without enough shares is refused.";
        ExampleRequest = new UpdateInvestmentTransactionRequest(
            Guid.Empty,
            Guid.Empty,
            InvestmentTransactionType.Buy,
            new DateOnly(2026, 9, 12),
            Guid.Empty,
            10m,
            104.52m,
            Fee: 1.25m);
        RequestParam(r => r.Quantity, "Shares for a buy or sell; new shares per old share for a split; shares moved for a symbol change.");
        RequestParam(r => r.RelatedSecurityId, "For a symbol change: the security the holding moves to; for a merger: the security received; for a spin-off: the new security.");
        RequestParam(r => r.RelatedQuantity, "For a merger or a spin-off: the shares of the security received.");
        RequestParam(r => r.CostShare, "For a merger paid in shares and cash, or a spin-off: the percentage of the cost basis carried into the new shares, 0 to 100.");
        RequestParam(r => r.Amount, "Cash amount for dividend, withholding tax, interest and fee entries; cash received for a merger.");
        RequestParam(r => r.Currency, "Currency for entries without a security. Defaults to the security's currency, then the account's.");
        Responses[200] = "The entry was corrected.";
        Responses[400] = "Validation failed, the entry was imported, the account or security is unknown, or no exchange rate exists for the date.";
        Responses[404] = "The entry does not exist.";
    }
}
