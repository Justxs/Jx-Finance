using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Categories;
using JxFinance.Endpoints.Categories.CreateCategory;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.Mappers;

public sealed class CategoryMapper : Mapper<CreateCategoryRequest, CategoryResponse, Category>
{
    public override Category ToEntity(CreateCategoryRequest request)
    {
        var category = new Category { Name = request.Name, Type = request.Type };
        Apply(request, category);
        return category;
    }

    public void Apply(ICategoryInput input, Category category)
    {
        category.Name = input.Name.Trim();
        category.Icon = OptionalText.Normalize(input.Icon);
        category.ApplySharing(input);
    }

    public override CategoryResponse FromEntity(Category category) => new(
        category.Id.Value,
        category.Name,
        category.Type,
        category.Icon,
        category.IsDefault,
        category.Scope,
        category.HouseholdId?.Value);
}
