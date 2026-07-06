using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.UpdateAccount;

public sealed record UpdateAccountRequest(
    Guid Id,
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    string StartingBalance,
    Scope Scope,
    Guid? HouseholdId);
