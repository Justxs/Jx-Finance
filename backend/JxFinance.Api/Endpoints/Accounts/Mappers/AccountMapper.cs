using JxFinance.Common;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.Mappers;

public static class AccountMapper
{
    public static Account ToEntity(this CreateAccountRequest request, Currency reportingCurrency)
    {
        var account = new Account { Name = request.Name };
        Apply(request, account, reportingCurrency);
        return account;
    }

    public static void ApplyTo(this IAccountInput input, Account account) => Apply(input, account, account.Currency);

    public static AccountResponse ToResponse(this Account account, AccountBalance balance) => new(
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
        account.ApplySharing(input);
    }
}
