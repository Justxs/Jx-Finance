using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.Accounts.UpdateAccount;

namespace JxFinance.Endpoints.Accounts.Mappers;

[RegisterService<AccountMapper>(LifeTime.Singleton)]
public sealed class AccountMapper(IInstanceSettingsStore settings) : Mapper<CreateAccountRequest, AccountResponse, Account>
{
    public override Account ToEntity(CreateAccountRequest request) => new()
    {
        Name = request.Name.Trim(),
        Description = OptionalText.Normalize(request.Description),
        Iban = Iban.Normalize(request.Iban),
        Type = request.Type,
        StartingBalance = MoneyWire.Parse(request.StartingBalance, request.Currency ?? settings.Current.ReportingCurrency),
        Scope = request.Scope,
        HouseholdId = HouseholdFor(request.Scope, request.HouseholdId),
    };

    public void UpdateEntity(UpdateAccountRequest request, Account account)
    {
        account.Name = request.Name.Trim();
        account.Description = OptionalText.Normalize(request.Description);
        account.Iban = Iban.Normalize(request.Iban);
        account.Type = request.Type;
        account.StartingBalance = MoneyWire.Parse(request.StartingBalance, request.Currency ?? account.Currency);
        account.Scope = request.Scope;
        account.HouseholdId = HouseholdFor(request.Scope, request.HouseholdId);
    }

    public AccountResponse FromEntity(Account account, AccountBalance balance) => new(
        account.Id.Value,
        account.Name,
        account.Description,
        account.Iban,
        account.Type,
        MoneyWire.ToWire(account.StartingBalance),
        MoneyWire.ToWire(balance.Total),
        account.CreatedAt,
        account.Scope,
        account.HouseholdId?.Value,
        account.Currency,
        balance.ByCurrency
            .Select(entry => new CurrencyBalance(entry.Currency, MoneyWire.ToWire(entry)))
            .ToList(),
        MoneyWire.ToWire(balance.Reporting),
        MoneyWire.ToWire(balance.Holdings));

    private static HouseholdId? HouseholdFor(Scope scope, Guid? householdId) =>
        scope == Scope.Shared ? new HouseholdId(householdId!.Value) : null;
}
