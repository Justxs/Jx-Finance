using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.CreateContactPayment;

public sealed class CreateContactPaymentSummary : Summary<CreateContactPaymentEndpoint, CreateContactPaymentRequest>
{
    public CreateContactPaymentSummary()
    {
        Summary = "Record money between you and a person";
        Description = "Records that you paid the person (ToContact), for example a loan or paying back what you owed, or "
            + "that they paid you or paid for you (FromContact). Your paying raises what they owe you; their paying "
            + "lowers it. Only the payment is stored: no account changes, and money that left or reached your bank "
            + "stays the ordinary ledger row it is.";
        ExampleRequest = new CreateContactPaymentRequest(
            Guid.Empty,
            ContactPaymentDirection.ToContact,
            50.00m,
            Currency.Eur,
            new DateOnly(2026, 10, 1),
            "Loan until payday");
        Params["id"] = ContactSummaryText.Id;
        RequestParam(r => r.Direction, "ToContact when you paid them, FromContact when they paid you or for you.");
        RequestParam(r => r.Amount, SummaryText.PositiveMoney);
        Responses[201] = "The payment as a history entry.";
        Responses[400] = "Validation failed.";
        Responses[404] = ContactSummaryText.NotFound;
    }
}
