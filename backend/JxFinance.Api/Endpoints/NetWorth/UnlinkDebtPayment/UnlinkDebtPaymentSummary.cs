using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.UnlinkDebtPayment;

public sealed class UnlinkDebtPaymentSummary : Summary<UnlinkDebtPaymentEndpoint, UnlinkDebtPaymentRequest>
{
    public UnlinkDebtPaymentSummary()
    {
        Summary = "Unlink a payment from a debt";
        Description = "Removes the link for good; it does not go to the trash. The transaction itself is not touched.";
        Params["id"] = "The debt id.";
        Params["paymentId"] = "The id of the link.";
        Responses[204] = "Unlinked.";
        Responses[404] = "No such debt belongs to the signed-in user, or the payment is not linked to it.";
    }
}
