using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.NetWorth.SetDebtBalance;

public sealed class SetDebtBalanceSummary : Summary<SetDebtBalanceEndpoint, SetDebtBalanceRequest>
{
    public SetDebtBalanceSummary()
    {
        Summary = "Record a balance of a debt";
        Description = "Records what was owed on one date, replacing a balance already recorded for that date. The "
            + "outstanding amount and as-of date of the debt follow the newest recorded balance, so a balance for an "
            + "earlier date only adds history. A debt that tracks payments counts them from the newest. Net worth "
            + "snapshots already taken are not rewritten.";
        Params["id"] = "The debt id.";
        Params["date"] = "The date of the balance, as yyyy-MM-dd. Not in the future.";
        RequestParam(r => r.Amount, "Decimal string with at most two decimal places, in the currency of the debt.");
        RequestParam(r => r.Note, "Optional, up to 200 characters, such as \"bank statement\".");
        Responses[200] = "The debt with its outstanding amount.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = "No such debt belongs to the signed-in user.";
        Responses[409] = "Someone else recorded a balance for the same date at the same moment. Try again.";
    }
}
