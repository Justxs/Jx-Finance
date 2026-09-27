using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.NetWorth.UpdateDebtPayment;

public sealed class UpdateDebtPaymentSummary : Summary<UpdateDebtPaymentEndpoint, UpdateDebtPaymentRequest>
{
    public UpdateDebtPaymentSummary()
    {
        Summary = "Change how a payment counts against a debt";
        Description = "Sets the kind of a linked payment and the principal typed from the bank statement. Leaving the "
            + "principal out goes back to the calculated split.";
        Params["id"] = "The debt id.";
        Params["paymentId"] = "The id of the link, from the payments list.";
        RequestParam(r => r.Kind, "regular (a month of interest first) or extra (all principal).");
        RequestParam(r => r.Principal, "Optional principal, a positive decimal string in the currency of the debt.");
        Responses[200] = "The debt with its new tracked balance.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = "No such debt belongs to the signed-in user, or the payment is not linked to it.";
    }
}
