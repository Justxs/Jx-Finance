using JxFinance.Common.Json;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record AccountResponse(
    Guid Id,
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    [property: Money] decimal StartingBalance,
    [property: Money] decimal CurrentBalance,
    DateTimeOffset CreatedAt,
    Scope Scope,
    Guid? HouseholdId,
    Currency Currency,
    IReadOnlyList<CurrencyBalance> Balances,
    [property: Money] decimal ReportingBalance,
    [property: Money] decimal HoldingsValue);
