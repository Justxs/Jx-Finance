using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Auth.Interfaces;

public interface IDemoDataService
{
    Task<Result> LoadAsync(Guid userId, CancellationToken cancellationToken);

    Task<Result> RemoveAsync(Guid userId, CancellationToken cancellationToken);
}
