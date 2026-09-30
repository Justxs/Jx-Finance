using JxFinance.Endpoints.Receipts.GetReceiptItems;

namespace JxFinance.Endpoints.Receipts.Interfaces;

public interface IReceiptItemReport
{
    Task<GetReceiptItemsResponse> GetAsync(GetReceiptItemsRequest request, CancellationToken cancellationToken);
}
