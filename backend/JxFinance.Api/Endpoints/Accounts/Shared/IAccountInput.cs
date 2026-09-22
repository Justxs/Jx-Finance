using JxFinance.Common.Sharing;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public interface IAccountInput : IShareableInput
{
    string Name { get; }
    string? Description { get; }
    string? Iban { get; }
    AccountType Type { get; }
    decimal? StartingBalance { get; }
    Currency? Currency { get; }
}
