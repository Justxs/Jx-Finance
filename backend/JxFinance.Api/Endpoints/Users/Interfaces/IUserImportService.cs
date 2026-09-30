using JxFinance.Domain.Common;
using JxFinance.Endpoints.Users.ImportMyData;

namespace JxFinance.Endpoints.Users.Interfaces;

public interface IUserImportService
{
    Task<Result<ImportMyDataResponse>> ImportAsync(Stream input, CancellationToken cancellationToken);
}
