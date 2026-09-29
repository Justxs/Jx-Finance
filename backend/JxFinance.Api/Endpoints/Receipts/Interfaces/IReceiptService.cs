using JxFinance.Domain.Common;
using JxFinance.Endpoints.Receipts.Shared;
using JxFinance.Endpoints.Receipts.UpdateReceiptCategories;

namespace JxFinance.Endpoints.Receipts.Interfaces;

public interface IReceiptService
{
    Task<Result<ReceiptReadingResponse>> ReadAsync(ReceiptSource source, CancellationToken cancellationToken);

    Task<Result> UpdateCategoriesAsync(
        Guid id,
        IReadOnlyList<ReceiptItemChoice> items,
        CancellationToken cancellationToken);
}
