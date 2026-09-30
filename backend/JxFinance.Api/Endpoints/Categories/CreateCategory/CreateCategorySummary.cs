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
        RequestParam(r => r.ParentId, "Optional top-level category of the same flow type to group this one under. "
            + "Categories nest one level: a sub-category cannot have sub-categories of its own. Filtering the ledger, "
            + "a budget and the reports by the parent include its sub-categories.");
        Responses[201] = "The category was created. The Location header points at it.";
        Responses[400] = "Validation failed, the name is taken, the named household is not one of yours, the parent is of the other "
            + "flow type (category.wrongType) or not a top-level category (category.nestingInvalid).";
        Responses[404] = "The parent category is not visible to you.";
    }
}
