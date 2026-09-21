using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.Trash;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Categories.Services;

[RegisterService<ICategoryService>(LifeTime.Scoped)]
public sealed class CategoryService(
    AppDbContext db,
    ICurrentUser currentUser,
    IClock clock,
    IDeletionRecorder deletions) : ICategoryService
{
    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken) =>
        await db.Categories
            .OrderBy(c => c.Type)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);

    public async Task<Result<Category>> CreateAsync(Category category, CancellationToken cancellationToken)
    {
        var membershipError = await ValidateHouseholdAsync(category.Scope, category.HouseholdId?.Value, cancellationToken);
        if (membershipError is not null)
        {
            return new DomainError(ErrorCodes.HouseholdNotMember, membershipError);
        }

        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);

        return category;
    }

    public async Task<Result<Category>> UpdateAsync(Guid id, Action<Category> apply, CancellationToken cancellationToken)
    {
        var categoryId = new CategoryId(id);
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == categoryId, cancellationToken);
        if (category is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Category not found.");
        }

        var (previousScope, previousHouseholdId) = (category.Scope, category.HouseholdId);
        apply(category);

        var membershipError = await ValidateHouseholdAsync(category.Scope, category.HouseholdId?.Value, cancellationToken);
        if (membershipError is not null)
        {
            return new DomainError(ErrorCodes.HouseholdNotMember, membershipError);
        }

        if (category.UserId != currentUser.Id &&
            (category.Scope != previousScope || category.HouseholdId != previousHouseholdId))
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the owner can change sharing.");
        }

        await db.SaveChangesAsync(cancellationToken);

        return category;
    }

    private async Task<string?> ValidateHouseholdAsync(
        Scope scope,
        Guid? householdId,
        CancellationToken cancellationToken)
    {
        if (scope == Scope.Personal || householdId is null)
        {
            return null;
        }

        var typedHouseholdId = new HouseholdId(householdId.Value);
        var isMember = await db.HouseholdMemberships.AnyAsync(
            m => m.HouseholdId == typedHouseholdId && m.UserId == currentUser.Id,
            cancellationToken);

        return isMember ? null : "You are not a member of that household.";
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var categoryId = new CategoryId(id);
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == categoryId, cancellationToken);
        if (category is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Category not found.");
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
            .IgnoreQueryFilters()
            .Where(t => lineParents.Contains(t.Id) && !t.IsDeleted)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        var bills = await db.RecurringBills
            .IgnoreQueryFilters()
            .Where(b => b.CategoryId == categoryId)
            .Select(b => new { b.Id, b.IsDeleted })
            .ToListAsync(cancellationToken);
        var budgets = await db.Budgets
            .IgnoreQueryFilters()
            .Where(b => b.CategoryId == categoryId && !b.IsDeleted)
            .Select(b => b.Id)
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

        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.CategoryId == categoryId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(t => t.CategoryId, (CategoryId?)null)
                    .SetProperty(t => t.UpdatedAt, now),
                cancellationToken);

        await db.TransactionLines.IgnoreQueryFilters().Where(l => l.CategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.CategoryId, (CategoryId?)null), cancellationToken);
        await db.RecurringBills.IgnoreQueryFilters().Where(b => b.CategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.CategoryId, (CategoryId?)null), cancellationToken);
        await db.Budgets.IgnoreQueryFilters().Where(b => b.CategoryId == categoryId && !b.IsDeleted)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, true), cancellationToken);
        db.Categories.Remove(category);
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return id;
    }
}
