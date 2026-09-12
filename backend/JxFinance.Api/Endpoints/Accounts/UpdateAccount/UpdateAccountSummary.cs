using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.UpdateAccount;

public sealed class UpdateAccountSummary : Summary<UpdateAccountEndpoint, UpdateAccountRequest>
{
    public UpdateAccountSummary()
    {
        Summary = "Update an account";
        Description = "Replaces the editable fields of an account. Moving an account from Personal to "
            + "Shared hands its history to the household; moving it back makes it private again. "
            + "Transactions already posted to the account keep their amounts.";
        ExampleRequest = new UpdateAccountRequest(
            Guid.Empty,
            "Everyday",
            "Salary lands here",
            "LT121000011101001000",
            AccountType.Checking,
            "1250.00",
            Scope.Personal,
            null);
        Params["id"] = "The account id. Takes precedence over the id in the body.";
        Responses[200] = "The updated account.";
        Responses[400] = "Validation failed, or the named household is not one of yours.";
        Responses[404] = "No such account is visible to the signed-in user.";
    }
}
