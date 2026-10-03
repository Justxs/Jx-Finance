using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Categories.CreateCategory;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Mappers;
using JxFinance.Endpoints.Categories.Shared;
using JxFinance.Endpoints.Categories.UpdateCategory;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Categories.Services;

[RegisterService<ICategoryService>(LifeTime.Scoped)]
public sealed class CategoryService(
    AppDbContext db,
    ICurrentUser currentUser,
    ISharingGuard sharing,
    IClock clock,
    IDeletionRecorder deletions) : ICategoryService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Category not found.");

    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var categories = await db.Categories
            .OrderBy(c => c.Type)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);
        return categories.Select(c => c.ToResponse()).ToList();
    }

    public async Task<Result<CategoryResponse>> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        if (await sharing.CheckAsync(request, cancellationToken) is { } sharingError)
        {
            return sharingError;
        }

        if (await ParentErrorAsync(request.ParentId, request.Type, null, cancellationToken) is { } parentError)
        {
            return parentError;
        }

        var category = request.ToEntity();
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);

        return category.ToResponse();
    }

    public async Task<Result<CategoryResponse>> UpdateAsync(
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        if (await FindAsync(new CategoryId(request.Id), cancellationToken) is not { } category)
        {
            return NotFound;
        }

        if (await sharing.CheckAsync(category, request, cancellationToken) is { } sharingError)
        {
            return sharingError;
        }

        if (await ParentErrorAsync(request.ParentId, category.Type, category.Id, cancellationToken) is { } parentError)
        {
            return parentError;
        }

        request.ApplyTo(category);
        await db.SaveChangesAsync(cancellationToken);

        return category.ToResponse();
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var categoryId = new CategoryId(id);
        if (await FindAsync(categoryId, cancellationToken) is not { } category)
        {
            return NotFound;
        }

        if (category.UserId != currentUser.Id)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the owner can delete a shared category.");
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var now = clock.UtcNow;

        var transactions = await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.CategoryId == categoryId)
            .Select(t => new { t.Id, t.IsDeleted })
            .ToListAsync(cancellationToken);
        var lines = await db.TransactionLines
            .Where(l => l.CategoryId == categoryId)
            .Select(l => new { l.Id, l.TransactionId })
            .ToListAsync(cancellationToken);
        var lineParents = lines.Select(l => l.TransactionId).Distinct().ToList();
        var liveLineParents = await db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => lineParents.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        var bills = await db.RecurringBills
            .IgnoreQueryFilters()
            .Where(b => b.CategoryId == categoryId)
            .Select(b => new { b.Id, b.IsDeleted })
            .ToListAsync(cancellationToken);
        var budgets = await db.Budgets
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(b => b.CategoryId == categoryId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);
        var children = await db.Categories
            .IgnoreQueryFilters()
            .Where(c => c.ParentId == categoryId)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        var liveTransactions = transactions.Where(t => !t.IsDeleted).Select(t => t.Id).Union(liveLineParents).Count();
        var entry = deletions.Record(
            TrashKind.Category,
            id,
            TrashLabel.Counted(
                category.Name,
                (liveTransactions, "transaction", "transactions"),
                (bills.Count(b => !b.IsDeleted), "recurring entry", "recurring entries"),
                (budgets.Count, "budget", "budgets")));
        entry.Remember(DeletionChangeKind.TransactionCategory, transactions.Select(t => t.Id.Value));
        entry.Remember(DeletionChangeKind.LineCategory, lines.Select(l => l.Id));
        entry.Remember(DeletionChangeKind.RecurringBillCategory, bills.Select(b => b.Id.Value));
        entry.Remember(DeletionChangeKind.Budget, budgets.Select(b => b.Value));
        entry.Remember(DeletionChangeKind.CategoryParent, children.Select(c => c.Value));

        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.CategoryId == categoryId)
            .SetCategoryAsync(null, now, cancellationToken);

        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => db.TransactionLines.Any(l => l.TransactionId == t.Id && l.CategoryId == categoryId))
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UpdatedAt, now), cancellationToken);
        await db.TransactionLines.IgnoreQueryFilters().Where(l => l.CategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.CategoryId, (CategoryId?)null), cancellationToken);
        await db.RecurringBills.IgnoreQueryFilters().Where(b => b.CategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.CategoryId, (CategoryId?)null), cancellationToken);
        await db.Budgets.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(b => b.CategoryId == categoryId)
            .SoftDeleteAsync(now, cancellationToken);
        await db.Categories.IgnoreQueryFilters().Where(c => c.ParentId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.ParentId, (CategoryId?)null), cancellationToken);
        db.Categories.Remove(category);
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return id;
    }

    private async Task<DomainError?> ParentErrorAsync(
        Guid? parentId,
        FlowType type,
        CategoryId? self,
        CancellationToken cancellationToken)
    {
        if (parentId is not { } value)
        {
            return null;
        }

        var parentCategoryId = new CategoryId(value);
        var parent = await db.Categories
            .Where(c => c.Id == parentCategoryId)
            .Select(c => new { c.Type, c.ParentId })
            .FirstOrDefaultAsync(cancellationToken);
        if (parent is null)
        {
            return EntityLookup.NotFound("The parent category was not found.");
        }

        if (parent.Type != type)
        {
            return new DomainError(ErrorCodes.CategoryWrongType, "A category and its parent must both be income or both be expense.");
        }

        var hasChildren = self is { } id && await db.Categories.AnyAsync(c => c.ParentId == id, cancellationToken);
        return parentCategoryId == self || parent.ParentId is not null || hasChildren
            ? new DomainError(
                ErrorCodes.CategoryNestingInvalid,
                "Categories nest one level deep: the parent must be a top-level category, and a category with sub-categories cannot have a parent.")
            : null;
    }

    private Task<Category?> FindAsync(CategoryId id, CancellationToken cancellationToken) =>
        db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
}
