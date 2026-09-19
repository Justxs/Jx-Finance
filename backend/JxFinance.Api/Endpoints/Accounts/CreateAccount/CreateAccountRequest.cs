using System.Text.Json.Serialization;
using JxFinance.Common.Json;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.CreateAccount;

public sealed record CreateAccountRequest(
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    [property: Money, JsonRequired] decimal StartingBalance,
    Scope Scope,
    Guid? HouseholdId,
    Currency? Currency = null);
