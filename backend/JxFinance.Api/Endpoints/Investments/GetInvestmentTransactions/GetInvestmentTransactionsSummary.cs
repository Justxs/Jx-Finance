using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetInvestmentTransactions;

public sealed class GetInvestmentTransactionsSummary
    : Summary<GetInvestmentTransactionsEndpoint, GetInvestmentTransactionsRequest>
{
    public GetInvestmentTransactionsSummary()
    {
        Summary = "List investment transactions";
        Description = "Pages through trades, dividends, withholding tax, interest, fees, splits and corporate actions on "
            + "accounts visible to you, newest first. CashAmount is signed: negative when cash left the account. A "
            + "corporate action that moves a holding names the security it moves to in RelatedSecurityId.";
        RequestParam(r => r.AccountId, "Only entries on this account.");
        RequestParam(r => r.SecurityId, "Only entries for this security, as the security or as the related security.");
        RequestParam(r => r.Type, "Only entries of this type.");
        Responses[200] = "A page of investment transactions.";
    }
}
