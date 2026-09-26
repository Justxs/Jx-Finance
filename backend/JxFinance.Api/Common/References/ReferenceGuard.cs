using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.References;

[RegisterService<IReferenceGuard>(LifeTime.Scoped)]
public sealed class ReferenceGuard(AppDbContext db) : IReferenceGuard
{
    private static readonly DomainError AccountMissing = new(ErrorCodes.ReferenceNotFound, "Account does not exist.");

    private static readonly DomainError CategoryMissing = new(ErrorCodes.ReferenceNotFound, "Category does not exist.");

    private static readonly DomainError TagMissing = new(ErrorCodes.ReferenceNotFound, "Tag does not exist.");

    public async Task<DomainError?> AccountExistsAsync(AccountId accountId, CancellationToken cancellationToken) =>
        await db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken) ? null : AccountMissing;

    public async Task<Result<Currency>> AccountCurrencyAsync(AccountId accountId, CancellationToken cancellationToken) =>
        await db.Accounts
            .Where(a => a.Id == accountId)
            .Select(a => (Currency?)a.StartingBalance.Currency)
            .FirstOrDefaultAsync(cancellationToken) is { } currency
            ? currency
            : AccountMissing;

    public async Task<DomainError?> CategoryExistsAsync(CategoryId categoryId, CancellationToken cancellationToken) =>
        await db.Categories.AnyAsync(c => c.Id == categoryId, cancellationToken) ? null : CategoryMissing;

    public async Task<DomainError?> CategoryOfTypeAsync(
        CategoryId categoryId,
        FlowType type,
        string wrongTypeMessage,
        CancellationToken cancellationToken)
    {
        var found = await TypeOfAsync(categoryId, cancellationToken);
        if (found is null)
        {
            return CategoryMissing;
        }

        return found != type ? new DomainError(ErrorCodes.CategoryWrongType, wrongTypeMessage) : null;
    }

    public async Task<DomainError?> CategoryOfTypeAsync(
        CategoryId categoryId,
        FlowType type,
        DomainError unavailable,
        CancellationToken cancellationToken) =>
        await TypeOfAsync(categoryId, cancellationToken) == type ? null : unavailable;

    public async Task<DomainError?> TagsExistAsync(IEnumerable<Guid> tagIds, CancellationToken cancellationToken)
    {
        var wanted = tagIds.Distinct().Select(id => new TagId(id)).ToList();
        return wanted.Count == 0 || await db.Tags.CountAsync(t => wanted.Contains(t.Id), cancellationToken) == wanted.Count
            ? null
            : TagMissing;
    }

    private Task<FlowType?> TypeOfAsync(CategoryId categoryId, CancellationToken cancellationToken) =>
        db.Categories
            .Where(c => c.Id == categoryId)
            .Select(c => (FlowType?)c.Type)
            .FirstOrDefaultAsync(cancellationToken);
}
