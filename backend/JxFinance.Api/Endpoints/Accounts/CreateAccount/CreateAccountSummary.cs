using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.CreateAccount;

public sealed class CreateAccountSummary : Summary<CreateAccountEndpoint, CreateAccountRequest>
{
    public CreateAccountSummary()
    {
        Summary = "Create an account";
        Description = "Opens a new account. A personal account belongs to you alone; a shared account "
            + "must name a household you are a member of, and everyone in that household sees it and its "
            + "transactions. The starting balance is the balance before any transaction is recorded.";
        ExampleRequest = new CreateAccountRequest(
            "Everyday",
            "Salary lands here",
            "LT121000011101001000",
            AccountType.Checking,
            1250.00m,
            Scope.Personal,
            null);
        RequestParam(r => r.Name, "Display name, up to 100 characters.");
        RequestParam(r => r.Description, "Optional note, up to 500 characters.");
        RequestParam(r => r.Iban, "Optional IBAN. Validated for length and check digits; spaces are allowed.");
        RequestParam(r => r.Type, "Checking, Savings, Cash, or Other.");
        RequestParam(r => r.StartingBalance, "Decimal string with at most two decimal places, for example \"1250.00\".");
        RequestParam(r => r.Scope, "Personal keeps the account private; Shared exposes it to a household.");
        RequestParam(r => r.HouseholdId, "Required when Scope is Shared; must be a household you belong to.");
        Responses[201] = "The account was created. The Location header points at it.";
        Responses[400] = "Validation failed, or the named household is not one of yours.";
    }
}
