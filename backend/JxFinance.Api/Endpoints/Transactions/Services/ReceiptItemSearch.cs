using JxFinance.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transactions.Services;

public static class ReceiptItemSearch
{
    public static IQueryable<string> MatchingFiles(AppDbContext db, Guid userId, string search)
    {
        var pattern = LikePattern.Contains(search);
        return db.Database.SqlQuery<string>(
            $"""
            SELECT r."Sha256" AS "Value"
            FROM "ReceiptReadings" AS r
            WHERE r."UserId" = {userId}
                AND NOT r."IsDeleted"
                AND r."Status" = 'Read'
                AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements(r."Result" -> 'items') AS item
                    WHERE item ->> 'name' ILIKE {pattern} ESCAPE '\')
            """);
    }

    public static async Task<Dictionary<TransactionId, TransactionReceiptItemResponse>> MatchesAsync(
        AppDbContext db,
        IReadOnlyCollection<TransactionId> transactionIds,
        string search,
        CancellationToken cancellationToken)
    {
        if (transactionIds.Count == 0)
        {
            return [];
        }

        var files = await db.TransactionAttachments
            .Where(a => transactionIds.Contains(a.TransactionId))
            .Join(
                db.ReceiptReadings.Where(r => r.Status == ReceiptReadingStatus.Read),
                a => a.Sha256,
                r => r.Sha256,
                (a, r) => new { a.TransactionId, a.CreatedAt, a.WarrantyUntil, r.Result })
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return files
            .OrderBy(f => f.CreatedAt)
            .Select(f => (f.TransactionId, f.WarrantyUntil, Name: MatchingItem(f.Result, search)))
            .Where(f => f.Name is not null)
            .DistinctBy(f => f.TransactionId)
            .ToDictionary(f => f.TransactionId, f => new TransactionReceiptItemResponse(f.Name!, f.WarrantyUntil));
    }

    public static string? MatchingItem(ReceiptResult? result, string search)
    {
        var text = search.Trim();
        return result?.Items.FirstOrDefault(item => item.Name.Contains(text, StringComparison.OrdinalIgnoreCase))?.Name;
    }
}
