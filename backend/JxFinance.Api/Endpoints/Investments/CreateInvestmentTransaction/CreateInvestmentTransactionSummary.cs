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
            + "the oldest lots move with their cost and acquisition dates and no cash moves. The cash effect lands on the account's "
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
        RequestParam(r => r.RelatedSecurityId, "For a symbol change: the security the holding moves to.");
        RequestParam(r => r.Amount, "Cash amount for dividend, withholding tax, interest and fee entries.");
        RequestParam(r => r.Currency, "Currency for entries without a security. Defaults to the security's currency, then the account's.");
        Responses[201] = "The entry was recorded.";
        Responses[400] = "Validation failed, the account or security is unknown, or no exchange rate exists for the date.";
    }
}
