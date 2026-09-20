using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public interface IAccountInput
{
    string Name { get; }
    string? Description { get; }
    string? Iban { get; }
    AccountType Type { get; }
    decimal? StartingBalance { get; }
    Scope Scope { get; }
    Guid? HouseholdId { get; }
    Currency? Currency { get; }
}
