using JxFinance.Domain.Accounts;

namespace JxFinance.Endpoints.Accounts;

public sealed record AccountResponse(
    Guid Id,
    string Name,
    string? Description,
    string? Iban,
    AccountType Type,
    string StartingBalance,
    string CurrentBalance,
    DateTimeOffset CreatedAt);
