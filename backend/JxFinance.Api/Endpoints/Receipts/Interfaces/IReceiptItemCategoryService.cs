using JxFinance.Domain.Common;
using JxFinance.Endpoints.Receipts.GetReceiptItemCategories;

namespace JxFinance.Endpoints.Receipts.Interfaces;

public interface IReceiptItemCategoryService
{
    Task<GetReceiptItemCategoriesResponse> GetAsync(GetReceiptItemCategoriesRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> ForgetAsync(Guid id, CancellationToken cancellationToken);
}
