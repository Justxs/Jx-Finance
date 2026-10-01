using FastEndpoints;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.CreateContactSplit;

public sealed class CreateContactSplitSummary : Summary<CreateContactSplitEndpoint, CreateContactSplitRequest>
{
    public CreateContactSplitSummary()
    {
        Summary = "Split an expense with people";
        Description = "Splits an expense you paid from one of your own accounts with people outside the household, the "
            + "way a household split divides it between members: Equal, Shares by whole weights from 1 to 100, or Exact "
            + "amounts that add up to the expense, cents left over going to the largest remainders in the order listed "
            + "with you first. own is your part, or null when you take no part, which records the whole amount as owed, "
            + "for example money you lent with an ordinary bank payment. The split keeps a copy of the transaction's "
            + "date, description and amount. A transaction is split once, with a household or with people.";
        ExampleRequest = new CreateContactSplitRequest(
            Guid.Empty,
            SplitMethod.Equal,
            new OwnShareRequest(),
            [new ContactShareRequest(Guid.Empty)]);
        RequestParam(r => r.TransactionId, "The expense to split. It must be on an account you own.");
        RequestParam(r => r.Method, "Equal, Shares or Exact.");
        RequestParam(r => r.Own, "Your part: a weight for Shares, an amount for Exact; null when you take no part.");
        RequestParam(r => r.Shares, "One entry per person: a weight for Shares, an amount for Exact.");
        Responses[201] = "The split, with every person's amount.";
        Responses[400] = "Validation failed, the transaction is not visible, not yours or not an expense, a person is not "
            + "yours, or the exact amounts do not add up.";
        Responses[409] = "The transaction is already split, with a household or with people.";
    }
}
