using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.Mappers;

[RegisterService<AccountMapper>(LifeTime.Singleton)]
public sealed class AccountMapper(IInstanceSettingsStore settings) : Mapper<CreateAccountRequest, AccountResponse, Account>
{
    public override Account ToEntity(CreateAccountRequest request)
    {
        var account = new Account { Name = request.Name };
        Apply(request, account, settings.Current.ReportingCurrency);
        return account;
    }

    public void Apply(IAccountInput input, Account account) => Apply(input, account, account.Currency);

    public AccountResponse FromEntity(Account account, AccountBalance balance) => new(
        account.Id.Value,
        account.Name,
        account.Description,
        account.Iban,
        account.Type,
        account.StartingBalance.Amount,
        balance.Total.Amount,
        account.CreatedAt,
        account.Scope,
        account.HouseholdId?.Value,
        account.Currency,
        balance.ByCurrency
            .Select(entry => new CurrencyBalance(entry.Currency, entry.Amount))
            .ToList(),
        balance.Reporting.Amount,
        balance.Holdings.Amount);

    private static void Apply(IAccountInput input, Account account, Currency fallbackCurrency)
    {
        account.Name = input.Name.Trim();
        account.Description = OptionalText.Normalize(input.Description);
        account.Iban = Iban.Normalize(input.Iban);
        account.Type = input.Type;
        account.StartingBalance = new Money(input.StartingBalance!.Value, input.Currency ?? fallbackCurrency);
        account.Scope = input.Scope;
        account.HouseholdId = HouseholdFor(input.Scope, input.HouseholdId);
    }

    private static HouseholdId? HouseholdFor(Scope scope, Guid? householdId) =>
        scope == Scope.Shared ? new HouseholdId(householdId!.Value) : null;
}
