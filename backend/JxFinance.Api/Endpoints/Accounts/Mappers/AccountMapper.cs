using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.Accounts.UpdateAccount;

namespace JxFinance.Endpoints.Accounts.Mappers;

public sealed class AccountMapper : Mapper<CreateAccountRequest, AccountResponse, Account>
{
    public override Account ToEntity(CreateAccountRequest request) => new()
    {
        Name = request.Name.Trim(),
        Description = OptionalText.Normalize(request.Description),
        Iban = Iban.Normalize(request.Iban),
        Type = request.Type,
        StartingBalance = MoneyWire.Parse(request.StartingBalance),
        Scope = request.Scope,
        HouseholdId = HouseholdFor(request.Scope, request.HouseholdId),
    };

    public void UpdateEntity(UpdateAccountRequest request, Account account)
    {
        account.Name = request.Name.Trim();
        account.Description = OptionalText.Normalize(request.Description);
        account.Iban = Iban.Normalize(request.Iban);
        account.Type = request.Type;
        account.StartingBalance = MoneyWire.Parse(request.StartingBalance);
        account.Scope = request.Scope;
        account.HouseholdId = HouseholdFor(request.Scope, request.HouseholdId);
    }

    public AccountResponse FromEntity(Account account, decimal netMovement) => new(
        account.Id.Value,
        account.Name,
        account.Description,
        account.Iban,
        account.Type,
        MoneyWire.ToWire(account.StartingBalance),
        MoneyWire.ToWire(account.StartingBalance + netMovement),
        account.CreatedAt,
        account.Scope,
        account.HouseholdId?.Value);

    private static HouseholdId? HouseholdFor(Scope scope, Guid? householdId) =>
        scope == Scope.Shared ? new HouseholdId(householdId!.Value) : null;
}
