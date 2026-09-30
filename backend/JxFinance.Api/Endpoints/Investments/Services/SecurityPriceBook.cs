using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Investments.Services;

public static class SecurityPriceBook
{
    public static async Task<bool> RecordAsync(
        AppDbContext db,
        Security security,
        DateOnly date,
        decimal price,
        PriceSourceKind source,
        CancellationToken cancellationToken)
    {
        var point = await db.SecurityPrices.FirstOrDefaultAsync(p => p.SecurityId == security.Id && p.Date == date, cancellationToken);
        return Record(db, security, date, price, source, point);
    }

    public static bool Record(
        AppDbContext db,
        Security security,
        DateOnly date,
        decimal price,
        PriceSourceKind source,
        SecurityPrice? existing)
    {
        var point = existing ?? db.SecurityPrices.Local.FirstOrDefault(p => p.SecurityId == security.Id && p.Date == date);
        if (point is not null && !Replaces(source, point.Source))
        {
            return false;
        }

        var isChange = point?.Price != price;
        if (point is null)
        {
            db.SecurityPrices.Add(new SecurityPrice { SecurityId = security.Id, Date = date, Price = price, Source = source });
        }
        else
        {
            point.Price = price;
            point.Source = source;
        }

        if (security.LastPriceDate is null || date >= security.LastPriceDate)
        {
            security.LastPrice = price;
            security.LastPriceDate = date;
        }

        return isChange;
    }

    public static bool Replaces(PriceSourceKind incoming, PriceSourceKind stored) =>
        incoming != PriceSourceKind.Feed || stored == PriceSourceKind.Feed;

    public static async Task RemoveAsync(
        AppDbContext db,
        Security security,
        SecurityPrice point,
        CancellationToken cancellationToken)
    {
        db.SecurityPrices.Remove(point);
        var newest = await db.SecurityPrices
            .AsNoTracking()
            .Where(p => p.SecurityId == security.Id && p.Date != point.Date)
            .OrderByDescending(p => p.Date)
            .FirstOrDefaultAsync(cancellationToken);
        security.LastPrice = newest?.Price;
        security.LastPriceDate = newest?.Date;
    }
}
