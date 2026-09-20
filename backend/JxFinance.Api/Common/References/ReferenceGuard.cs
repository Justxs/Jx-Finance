using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.References;

[RegisterService<IReferenceGuard>(LifeTime.Scoped)]
public sealed class ReferenceGuard(AppDbContext db) : IReferenceGuard
{
    public async Task<DomainError?> AccountExistsAsync(AccountId accountId, CancellationToken cancellationToken) =>
        await db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken)
            ? null
            : new DomainError(ErrorCodes.ReferenceNotFound, "Account does not exist.");

    public async Task<DomainError?> CategoryOfTypeAsync(
        CategoryId categoryId,
        FlowType type,
        string wrongTypeMessage,
        CancellationToken cancellationToken)
    {
        var found = await TypeOfAsync(categoryId, cancellationToken);
        if (found is null)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Category does not exist.");
        }

        return found != type ? new DomainError(ErrorCodes.CategoryWrongType, wrongTypeMessage) : null;
    }

    public async Task<DomainError?> CategoryOfTypeAsync(
        CategoryId categoryId,
        FlowType type,
        DomainError unavailable,
        CancellationToken cancellationToken) =>
        await TypeOfAsync(categoryId, cancellationToken) == type ? null : unavailable;

    private Task<FlowType?> TypeOfAsync(CategoryId categoryId, CancellationToken cancellationToken) =>
        db.Categories
            .Where(c => c.Id == categoryId)
            .Select(c => (FlowType?)c.Type)
            .FirstOrDefaultAsync(cancellationToken);
}
