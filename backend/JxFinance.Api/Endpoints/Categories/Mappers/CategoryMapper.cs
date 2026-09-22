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
    }

    public static CategoryResponse ToResponse(this Category category) => new(
        category.Id.Value,
        category.Name,
        category.Type,
        category.Icon,
        category.IsDefault,
        category.Scope,
        category.HouseholdId?.Value);
}
