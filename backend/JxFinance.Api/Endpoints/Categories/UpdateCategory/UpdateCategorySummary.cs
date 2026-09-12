using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategorySummary : Summary<UpdateCategoryEndpoint, UpdateCategoryRequest>
{
    public UpdateCategorySummary()
    {
        Summary = "Update a category";
        Description = "Renames a category, changes its icon, or moves it between personal and shared. "
            + "The flow type is deliberately absent: it cannot be changed after creation.";
        ExampleRequest = new UpdateCategoryRequest(Guid.Empty, "Groceries", "shopping-cart", Scope.Personal, null);
        Params["id"] = "The category id. Takes precedence over the id in the body.";
        Responses[200] = "The updated category.";
        Responses[400] = "Validation failed, the name is taken, or the named household is not one of yours.";
        Responses[404] = "No such category is visible to the signed-in user.";
    }
}
