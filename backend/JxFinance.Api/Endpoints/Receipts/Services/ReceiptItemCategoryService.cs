using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Endpoints.Receipts.GetReceiptItemCategories;
using JxFinance.Endpoints.Receipts.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Receipts.Services;

[RegisterService<IReceiptItemCategoryService>(LifeTime.Scoped)]
public sealed class ReceiptItemCategoryService(AppDbContext db) : IReceiptItemCategoryService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Remembered item not found.");

    public async Task<GetReceiptItemCategoriesResponse> GetAsync(
        GetReceiptItemCategoriesRequest request,
        CancellationToken cancellationToken)
    {
        var search = ReceiptItemKey.Normalize(request.Search ?? "");
        var matching = db.ReceiptItemCategories
            .AsNoTracking()
            .Where(m => search.Length == 0 || m.Key.Contains(search));
        var total = await matching.CountAsync(cancellationToken);
        var items = await matching
            .OrderByDescending(m => m.UpdatedAt)
            .ThenBy(m => m.Key)
            .Take(GetReceiptItemCategoriesResponse.MaxItems)
            .Select(m => new ReceiptItemCategoryResponse(m.Id.Value, m.Key, m.CategoryId.Value, m.UpdatedAt))
            .ToListAsync(cancellationToken);
        return new GetReceiptItemCategoriesResponse(items, total);
    }

    public async Task<Result<Guid>> ForgetAsync(Guid id, CancellationToken cancellationToken)
    {
        var typedId = new ReceiptItemCategoryId(id);
        var forgotten = await db.ReceiptItemCategories.Where(m => m.Id == typedId).ExecuteDeleteAsync(cancellationToken);
        return forgotten > 0 ? id : NotFound;
    }
}
