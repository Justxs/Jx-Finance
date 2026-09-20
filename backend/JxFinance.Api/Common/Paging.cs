using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public interface IPagedRequest
{
    int Page { get; }

    int PageSize { get; }
}

public static class Paging
{
    public const int MaxPageSize = 200;

    public static async Task<PagedResponse<T>> ToPageAsync<T>(
        this IQueryable<T> query,
        IPagedRequest request,
        Func<IQueryable<T>, IQueryable<T>> sort,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(request.Page, 1);
        var pageSize = Math.Clamp(request.PageSize, 1, MaxPageSize);

        var total = await query.CountAsync(cancellationToken);
        var items = await sort(query)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<T>(items, page, pageSize, total);
    }

    public static PagedResponse<TResult> Map<T, TResult>(this PagedResponse<T> page, Func<T, TResult> map) =>
        new(page.Items.Select(map).ToList(), page.Page, page.PageSize, page.Total);
}
