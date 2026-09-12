using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Categories.CreateCategory;
using JxFinance.Endpoints.Categories.Shared;
using JxFinance.Endpoints.Categories.UpdateCategory;

namespace JxFinance.Endpoints.Categories.Mappers;

public sealed class CategoryMapper : Mapper<CreateCategoryRequest, CategoryResponse, Category>
{
    public override Category ToEntity(CreateCategoryRequest request) => new()
    {
        Name = request.Name.Trim(),
        Type = request.Type,
        Icon = OptionalText.Normalize(request.Icon),
        Scope = request.Scope,
        HouseholdId = HouseholdFor(request.Scope, request.HouseholdId),
    };

    public void UpdateEntity(UpdateCategoryRequest request, Category category)
    {
        category.Name = request.Name.Trim();
        category.Icon = OptionalText.Normalize(request.Icon);
        category.Scope = request.Scope;
        category.HouseholdId = HouseholdFor(request.Scope, request.HouseholdId);
    }

    public override CategoryResponse FromEntity(Category category) => new(
        category.Id.Value,
        category.Name,
        category.Type,
        category.Icon,
        category.IsDefault,
        category.Scope,
        category.HouseholdId?.Value);

    private static HouseholdId? HouseholdFor(Scope scope, Guid? householdId) =>
        scope == Scope.Shared ? new HouseholdId(householdId!.Value) : null;
}
