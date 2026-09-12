using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.CreateCategory;

public sealed class CreateCategorySummary : Summary<CreateCategoryEndpoint, CreateCategoryRequest>
{
    public CreateCategorySummary()
    {
        Summary = "Create a category";
        Description = "Adds a category for transactions to be attributed to. The flow type is fixed at "
            + "creation and cannot be changed afterwards, because moving a category between income and "
            + "expense would silently rewrite the meaning of every transaction already filed under it.";
        ExampleRequest = new CreateCategoryRequest("Groceries", FlowType.Expense, "shopping-cart", Scope.Personal, null);
        RequestParam(r => r.Name, "Display name, unique within its scope.");
        RequestParam(r => r.Type, "Income or Expense. Fixed once the category exists.");
        RequestParam(r => r.Icon, "Optional icon key rendered by the client.");
        RequestParam(r => r.Scope, "Personal keeps the category private; Shared exposes it to a household.");
        RequestParam(r => r.HouseholdId, "Required when Scope is Shared; must be a household you belong to.");
        Responses[201] = "The category was created. The Location header points at it.";
        Responses[400] = "Validation failed, the name is taken, or the named household is not one of yours.";
    }
}
