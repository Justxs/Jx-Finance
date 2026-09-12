using JxFinance.Common.Errors;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Categories.CreateCategory;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Mappers;
using JxFinance.Endpoints.Categories.Shared;
using JxFinance.Endpoints.Categories.UpdateCategory;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Categories.Services;

public sealed class CategoryService(AppDbContext db, ICurrentUser currentUser, CategoryMapper mapper) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var categories = await db.Categories
            .OrderBy(c => c.Type)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);

        return categories.Select(mapper.FromEntity).ToList();
    }

    public async Task<Result<CategoryResponse>> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var membershipError = await ValidateHouseholdAsync(request.Scope, request.HouseholdId, cancellationToken);
        if (membershipError is not null)
        {
            return Result<CategoryResponse>.Failure(ErrorCodes.Validation, membershipError);
        }

        var category = mapper.ToEntity(request);

        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);

        return Result<CategoryResponse>.Success(mapper.FromEntity(category));
    }

    public async Task<Result<CategoryResponse>> UpdateAsync(
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var categoryId = new CategoryId(request.Id);
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == categoryId, cancellationToken);
        if (category is null)
        {
            return Result<CategoryResponse>.Failure(ErrorCodes.NotFound, "Category not found.");
        }

        var membershipError = await ValidateHouseholdAsync(request.Scope, request.HouseholdId, cancellationToken);
        if (membershipError is not null)
        {
            return Result<CategoryResponse>.Failure(ErrorCodes.Validation, membershipError);
        }

        if (category.UserId != currentUser.Id &&
            (category.Scope != request.Scope || category.HouseholdId?.Value != request.HouseholdId))
        {
            return Result<CategoryResponse>.Failure(ErrorCodes.Forbidden, "Only the owner can change sharing.");
        }

        mapper.UpdateEntity(request, category);
        await db.SaveChangesAsync(cancellationToken);

        return Result<CategoryResponse>.Success(mapper.FromEntity(category));
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
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Category not found.");
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.CategoryId == categoryId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(t => t.CategoryId, (CategoryId?)null)
                    .SetProperty(t => t.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken);

        await db.TransactionLines.Where(l => l.CategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.CategoryId, (CategoryId?)null), cancellationToken);
        await db.RecurringBills.IgnoreQueryFilters().Where(b => b.CategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.CategoryId, (CategoryId?)null), cancellationToken);
        await db.Budgets.IgnoreQueryFilters().Where(b => b.CategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDeleted, true), cancellationToken);
        db.Categories.Remove(category);
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }
}
