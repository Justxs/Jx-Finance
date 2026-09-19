using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Brokers.InteractiveBrokers;

public interface IFlexClient
{
    Task<Result<Stream>> DownloadAsync(string token, string queryId, CancellationToken cancellationToken);
}
