using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Endpoints.Receipts.GetReceiptItems;
using JxFinance.Endpoints.Receipts.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Receipts.Services;

[RegisterService<IReceiptItemReport>(LifeTime.Scoped)]
public sealed class ReceiptItemReport(AppDbContext db) : IReceiptItemReport
{
    public async Task<GetReceiptItemsResponse> GetAsync(GetReceiptItemsRequest request, CancellationToken cancellationToken)
    {
        var (from, to) = (request.DateFrom!.Value, request.DateTo!.Value);
        var attached = await db.TransactionAttachments
            .Join(
                db.Transactions.Where(t => t.Date >= from && t.Date <= to),
                a => a.TransactionId,
                t => t.Id,
                (a, t) => new { a.Sha256, t.Date, t.Amount.Currency })
            .ToListAsync(cancellationToken);
        var hashes = attached.Select(a => a.Sha256).Distinct().ToList();
        var readings = await db.ReceiptReadings
            .AsNoTracking()
            .Where(r => r.Status == ReceiptReadingStatus.Read && hashes.Contains(r.Sha256))
            .Select(r => new { r.Sha256, r.Result })
            .ToListAsync(cancellationToken);

        var search = string.IsNullOrWhiteSpace(request.Search) ? null : ReceiptItemKey.Normalize(request.Search);
        var bought = readings
            .Where(r => r.Result is not null)
            .SelectMany(r =>
            {
                var receipt = attached.Where(a => a.Sha256 == r.Sha256).MaxBy(a => a.Date)!;
                var currency = r.Result!.Currency ?? receipt.Currency;
                return r.Result.Items.Select(item => (
                    Key: ReceiptItemKey.Normalize(item.Name),
                    item.Name,
                    Currency: currency,
                    Amount: Math.Max(0m, item.Amount - item.Discount + item.Deposit),
                    receipt.Date));
            })
            .Where(item => item.Key.Length > 0 && (search is null || item.Key.Contains(search, StringComparison.Ordinal)))
            .ToList();

        var items = bought
            .GroupBy(item => (item.Key, item.Currency))
            .Select(group => new ReceiptItemSpend(
                group.Key.Key,
                group.MaxBy(item => item.Date).Name,
                group.Key.Currency,
                Money.Round(group.Sum(item => item.Amount)),
                group.Count(),
                group.Max(item => item.Date)))
            .OrderByDescending(item => item.Amount)
            .ThenBy(item => item.Key, StringComparer.Ordinal)
            .Take(GetReceiptItemsResponse.MaxItems)
            .ToList();

        return new GetReceiptItemsResponse(items, readings.Count);
    }
}
