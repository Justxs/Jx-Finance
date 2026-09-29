using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Confirm;

namespace JxFinance.Endpoints.Imports.Interfaces;

public interface IImportConfirmService
{
    Task<Result<ImportConfirmResponse>> ConfirmAsync(ImportConfirmRequest request, CancellationToken cancellationToken);
}
