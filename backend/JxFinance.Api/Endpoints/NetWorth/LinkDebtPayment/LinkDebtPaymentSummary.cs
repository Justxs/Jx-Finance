using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.NetWorth.LinkDebtPayment;

public sealed class LinkDebtPaymentSummary : Summary<LinkDebtPaymentEndpoint, LinkDebtPaymentRequest>
{
    public LinkDebtPaymentSummary()
    {
        Summary = "Link a payment to a debt";
        Description = "Marks an expense transaction as a payment of a debt that tracks its payments, lowering the tracked "
            + "balance by its principal. The transaction stays an ordinary expense in reports and budgets. A transaction "
            + "pays at most one debt. The link is private to the owner of the debt, even on a shared account.";
        Params["id"] = "The debt id.";
        RequestParam(r => r.TransactionId, "An expense transaction the signed-in user can see, not split.");
        RequestParam(r => r.Kind, "regular or extra. Left out, it is regular unless a regular payment is already linked in the same calendar month.");
        RequestParam(r => r.Principal, "Optional principal from the bank statement, a positive decimal string in the currency of the debt. It replaces the calculated split.");
        Responses[200] = "The debt with its new tracked balance.";
        Responses[400] = SummaryText.ValidationFailed
            + " debt.notTracked when the debt does not track payments; reference.notFound when the transaction is not "
            + "visible; debt.paymentWrongType when it is not an expense; transaction.splitNotAllowed when it is split.";
        Responses[404] = "No such debt belongs to the signed-in user.";
        Responses[409] = "debt.paymentTaken when the transaction already pays a debt.";
    }
}
