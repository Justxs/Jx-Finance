using JxFinance.Domain.Categories;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public static class TransactionUpdates
{
    public static Task<int> SetCategoryAsync(
        this IQueryable<Transaction> transactions,
        CategoryId? categoryId,
        DateTimeOffset now,
        CancellationToken cancellationToken) =>
        transactions.ExecuteUpdateAsync(
            setters => setters
                .SetProperty(t => t.CategoryId, categoryId)
                .SetProperty(t => t.UpdatedAt, now)
                .SetProperty(t => t.UnusualCheckedAt, (DateTimeOffset?)null),
            cancellationToken);
}
