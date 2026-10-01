using FastEndpoints;

namespace JxFinance.Endpoints.Contacts.DeleteContactPayment;

public sealed class DeleteContactPaymentSummary : Summary<DeleteContactPaymentEndpoint>
{
    public DeleteContactPaymentSummary()
    {
        Summary = "Delete a payment with a person";
        Description = "Removes the payment from the person's balance. It is listed in your trash, from where "
            + "POST /api/trash/restore brings it back while the person still exists.";
        Params["id"] = "The payment id.";
        Responses[204] = "The payment is deleted.";
        Responses[404] = "You have no such payment.";
    }
}
