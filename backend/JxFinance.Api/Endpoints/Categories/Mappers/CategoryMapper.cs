using JxFinance.Common;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Categories;
using JxFinance.Endpoints.Categories.CreateCategory;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.Mappers;

public static class CategoryMapper
{
    public static Category ToEntity(this CreateCategoryRequest request)
    {
        var category = new Category { Name = request.Name, Type = request.Type };
        request.ApplyTo(category);
        return category;
    }

    public static void ApplyTo(this ICategoryInput input, Category category)
    {
        category.Name = input.Name.Trim();
        category.Icon = OptionalText.Normalize(input.Icon);
        category.ApplySharing(input);
        category.ParentId = input.ParentId is { } parentId ? new CategoryId(parentId) : null;
    }

    public static CategoryResponse ToResponse(this Category category, Guid callerId) => new(
        category.Id.Value,
        category.Name,
        category.Type,
        category.Icon,
        category.IsDefault,
        category.Scope,
        category.HouseholdId?.Value,
        category.UserId == callerId,
        category.ParentId?.Value);
}
