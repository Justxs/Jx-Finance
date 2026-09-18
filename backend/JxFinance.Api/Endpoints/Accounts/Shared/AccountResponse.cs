using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record AccountResponse(
    Guid Id,
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    string StartingBalance,
    string CurrentBalance,
    DateTimeOffset CreatedAt,
    Scope Scope,
    Guid? HouseholdId,
    Currency Currency,
    IReadOnlyList<CurrencyBalance> Balances,
    string ReportingBalance);
