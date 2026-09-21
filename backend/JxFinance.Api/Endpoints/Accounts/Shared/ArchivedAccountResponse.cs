using JxFinance.Common.Json;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record ArchivedAccountResponse(
    Guid Id,
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    [property: Money] decimal StartingBalance,
    Currency Currency,
    Scope Scope,
    Guid? HouseholdId,
    DateTimeOffset ArchivedAt,
    bool CanRestore);
