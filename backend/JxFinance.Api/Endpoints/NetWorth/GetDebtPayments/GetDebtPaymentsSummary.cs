using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetDebtPayments;

public sealed class GetDebtPaymentsSummary : Summary<GetDebtPaymentsEndpoint>
{
    public GetDebtPaymentsSummary()
    {
        Summary = "List the payments of a debt";
        Description = "Returns the linked payments dated after the as-of date of a debt that tracks its payments, oldest "
            + "first. Each row splits the payment, in the currency of the debt, into interest and principal and carries "
            + "the balance after it. A regular payment pays a month of interest at the debt's rate first, an extra "
            + "payment is all principal, and a principal typed on the link wins over both. Payments whose transaction "
            + "was deleted or is no longer visible, and payments without an exchange rate, are left out; the debt "
            + "counts them in unavailablePayments and trackedIncomplete. A debt that does not track payments has none.";
        Params["id"] = "The debt id.";
        Responses[200] = "The payments, oldest first.";
        Responses[404] = "No such debt belongs to the signed-in user.";
    }
}
