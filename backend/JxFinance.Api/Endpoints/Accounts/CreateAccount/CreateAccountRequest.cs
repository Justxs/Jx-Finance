using JxFinance.Domain.Accounts;

namespace JxFinance.Endpoints.Accounts.CreateAccount;

public sealed record CreateAccountRequest(
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    string StartingBalance);
