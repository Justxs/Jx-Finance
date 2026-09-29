using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Users.Interfaces;

public interface IUserExportService
{
    Task<Result> WriteAsync(bool attachments, Func<string, Stream> start, CancellationToken cancellationToken);
}
