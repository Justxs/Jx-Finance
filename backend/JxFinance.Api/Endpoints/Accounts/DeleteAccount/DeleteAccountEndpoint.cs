using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Interfaces;

namespace JxFinance.Endpoints.Accounts.DeleteAccount;

public sealed class DeleteAccountEndpoint(IAccountService accountService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Accounts + "/{id}");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        accountService.ArchiveAsync(id, ct);
}
