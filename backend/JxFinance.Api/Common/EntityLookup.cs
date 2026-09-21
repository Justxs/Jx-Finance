using System.Linq.Expressions;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public static class EntityLookup
{
    public static async Task<Result<T>> FindOrNotFoundAsync<T>(
        this IQueryable<T> query,
        Expression<Func<T, bool>> predicate,
        string message,
        CancellationToken cancellationToken)
        where T : class
    {
        var entity = await query.FirstOrDefaultAsync(predicate, cancellationToken);
        if (entity is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, message);
        }

        return entity;
    }

    public static async Task<Result<T>> UpdateOrNotFoundAsync<T>(
        this AppDbContext db,
        Expression<Func<T, bool>> predicate,
        string message,
        Action<T> apply,
        CancellationToken cancellationToken)
        where T : class
    {
        var found = await db.Set<T>().FindOrNotFoundAsync(predicate, message, cancellationToken);
        if (found.TryGetValue(out var entity))
        {
            apply(entity);
            await db.SaveChangesAsync(cancellationToken);
        }

        return found;
    }

    public static Task<Result<Guid>> DeleteOrNotFoundAsync<T>(
        this AppDbContext db,
        Guid id,
        Expression<Func<T, bool>> predicate,
        string message,
        CancellationToken cancellationToken)
        where T : class =>
        db.DeleteOrNotFoundAsync(id, predicate, message, _ => { }, cancellationToken);

    public static async Task<Result<Guid>> DeleteOrNotFoundAsync<T>(
        this AppDbContext db,
        Guid id,
        Expression<Func<T, bool>> predicate,
        string message,
        Action<T> beforeDelete,
        CancellationToken cancellationToken)
        where T : class
    {
        var found = await db.Set<T>().FindOrNotFoundAsync(predicate, message, cancellationToken);
        if (!found.TryGetValue(out var entity))
        {
            return found.Error;
        }

        beforeDelete(entity);
        db.Set<T>().Remove(entity);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }
}
