using JxFinance.Domain.Common;

namespace JxFinance.Common.Receipts;

public interface IReceiptReader
{
    Task<Result<ReceiptExtraction>> ReadAsync(ReceiptRequest request, CancellationToken cancellationToken);

    Task<Result> CheckKeyAsync(string apiKey, string model, CancellationToken cancellationToken);
}
