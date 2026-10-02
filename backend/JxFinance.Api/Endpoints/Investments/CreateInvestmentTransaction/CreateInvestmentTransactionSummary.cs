using FastEndpoints;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.CreateInvestmentTransaction;

public sealed class CreateInvestmentTransactionSummary
    : Summary<CreateInvestmentTransactionEndpoint, CreateInvestmentTransactionRequest>
{
    public CreateInvestmentTransactionSummary()
    {
        Summary = "Record an investment transaction";
        Description = "Buys and sells need a security, quantity and price, and move quantity times price plus or minus "
            + "the fee in the security's currency. Dividends, withholding tax, interest and fees need an amount. A split "
            + "needs a security and a ratio in Quantity and moves no cash. A symbol change needs the security the holding "
            + "leaves, the one it moves to in RelatedSecurityId, in the same currency, and the shares moved in Quantity; "
            + "the oldest lots move with their cost and acquisition dates and no cash moves. A merger needs the security "
            + "taken over and the shares given up in Quantity, and either the cash received in Amount, the security "
            + "received in RelatedSecurityId with its shares in RelatedQuantity, or both; with both, CostShare is the "
            + "percentage of the cost basis carried into the new shares and the rest is set against the cash as a "
            + "disposal. The cash effect lands on the account's "
            + "balance in that currency and never counts as income or expense in reports or budgets.";
        ExampleRequest = new CreateInvestmentTransactionRequest(
            Guid.Empty,
            InvestmentTransactionType.Buy,
            new DateOnly(2026, 9, 12),
            Guid.Empty,
            10m,
            104.52m,
            Fee: 1.25m);
        RequestParam(r => r.Quantity, "Shares for a buy or sell; new shares per old share for a split; shares moved for a symbol change.");
        RequestParam(r => r.RelatedSecurityId, "For a symbol change: the security the holding moves to; for a merger: the security received.");
        RequestParam(r => r.RelatedQuantity, "For a merger: the shares of the security received.");
        RequestParam(r => r.CostShare, "For a merger paid in shares and cash: the percentage of the cost basis carried into the new shares, 0 to 100.");
        RequestParam(r => r.Amount, "Cash amount for dividend, withholding tax, interest and fee entries; cash received for a merger.");
        RequestParam(r => r.Currency, "Currency for entries without a security. Defaults to the security's currency, then the account's.");
        Responses[201] = "The entry was recorded.";
        Responses[400] = "Validation failed, the account or security is unknown, or no exchange rate exists for the date.";
    }
}
