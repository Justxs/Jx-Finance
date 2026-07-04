using JxFinance.Common.Errors;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Categories.CreateCategory;
using JxFinance.Endpoints.Categories.UpdateCategory;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Categories;

public sealed class CategoryService(AppDbContext db) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await db.Categories
            .OrderBy(c => c.Type)
            .ThenBy(c => c.Name)
            .Select(c => new CategoryResponse(c.Id.Value, c.Name, c.Type, c.Icon, c.IsDefault))
            .ToListAsync(cancellationToken);
    }

    public async Task<Result<CategoryResponse>> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var category = new Category
        {
            Name = request.Name.Trim(),
            Type = request.Type,
            Icon = NormalizeIcon(request.Icon),
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);

        return Result<CategoryResponse>.Success(ToResponse(category));
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

        category.Name = request.Name.Trim();
        category.Icon = NormalizeIcon(request.Icon);
        await db.SaveChangesAsync(cancellationToken);

        return Result<CategoryResponse>.Success(ToResponse(category));
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
            .Where(t => t.CategoryId == categoryId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(t => t.CategoryId, (CategoryId?)null)
                    .SetProperty(t => t.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken);

        db.Categories.Remove(category);
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private static string? NormalizeIcon(string? icon)
    {
        var trimmed = icon?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static CategoryResponse ToResponse(Category category) =>
        new(category.Id.Value, category.Name, category.Type, category.Icon, category.IsDefault);
}
