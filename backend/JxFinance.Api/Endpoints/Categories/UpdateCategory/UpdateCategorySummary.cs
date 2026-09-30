using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategorySummary : Summary<UpdateCategoryEndpoint, UpdateCategoryRequest>
{
    public UpdateCategorySummary()
    {
        Summary = "Update a category";
        Description = "Renames a category, changes its icon, or moves it between personal and shared. "
            + "The flow type is deliberately absent: it cannot be changed after creation. The parent is replaced "
            + "like every other field, so an update without parentId makes the category top-level again.";
        ExampleRequest = new UpdateCategoryRequest(Guid.Empty, "Groceries", "shopping-cart", Scope.Personal, null);
        Params["id"] = "The category id. Takes precedence over the id in the body.";
        Responses[200] = "The updated category.";
        Responses[400] = "Validation failed, the name is taken, the named household is not one of yours, the parent is of the other "
            + "flow type (category.wrongType), or the nesting would go deeper than one level (category.nestingInvalid).";
        Responses[404] = "No such category, or no such parent, is visible to the signed-in user.";
    }
}
