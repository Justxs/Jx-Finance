using JxFinance.Domain.Common;

namespace JxFinance.Common;

public static class DateWindowQueries
{
    public static IQueryable<T> Within<T>(this IQueryable<T> query, DateWindow window, DateWindow? comparison = null)
        where T : class, IDated =>
        comparison is { } other
            ? query.Where(t => (t.Date >= window.Start && t.Date < window.ExclusiveEnd)
                || (t.Date >= other.Start && t.Date < other.ExclusiveEnd))
            : query.Where(t => t.Date >= window.Start && t.Date < window.ExclusiveEnd);
}
