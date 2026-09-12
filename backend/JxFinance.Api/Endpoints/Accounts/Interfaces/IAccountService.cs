using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.CreateAccount;
using JxFinance.Endpoints.Accounts.GetAccounts;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.Accounts.UpdateAccount;

namespace JxFinance.Endpoints.Accounts.Interfaces;

public interface IAccountService
{
    Task<IReadOnlyList<AccountResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<AccountResponse>> GetAllAsync(
        GetAccountsRequest request,
        CancellationToken cancellationToken);

    Task<Result<AccountResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<AccountResponse>> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken);

    Task<Result<AccountResponse>> UpdateAsync(UpdateAccountRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> ArchiveAsync(Guid id, CancellationToken cancellationToken);
}
