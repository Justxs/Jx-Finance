using JxFinance.Domain.Common;

namespace JxFinance.Common.Receipts;

public interface IReceiptReader
{
    bool IsAvailable { get; }

    Task<Result<string>> ReadTextAsync(byte[] image, CancellationToken cancellationToken);
}
