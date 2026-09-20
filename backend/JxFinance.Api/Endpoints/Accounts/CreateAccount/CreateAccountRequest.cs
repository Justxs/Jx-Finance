using JxFinance.Common.Json;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.CreateAccount;

public sealed record CreateAccountRequest(
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    [property: Money(NotNull = true)] decimal? StartingBalance,
    Scope Scope,
    Guid? HouseholdId,
    Currency? Currency = null) : IAccountInput;
