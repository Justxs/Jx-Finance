using FastEndpoints;

namespace JxFinance.Endpoints.Contacts.GetContacts;

public sealed class GetContactsSummary : Summary<GetContactsEndpoint>
{
    public GetContactsSummary()
    {
        Summary = "List the people you keep money with";
        Description = "Returns your people outside the household, by name, each with the open balance per currency. A "
            + "positive amount is owed to you, a negative one is owed by you. A balance is what the person's shares of "
            + "your splits add up to, plus the payments you made to them, minus the payments they made to you. A split "
            + "whose transaction is deleted stops counting until the transaction is restored. Currencies are never "
            + "converted, and nothing here enters reports, budgets or net worth. People are personal: nobody else sees them.";
        Responses[200] = "Your people with their non-zero balances.";
    }
}
