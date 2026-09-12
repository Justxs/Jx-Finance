using FastEndpoints;

namespace JxFinance.Endpoints.Categories.DeleteCategory;

public sealed class DeleteCategorySummary : Summary<DeleteCategoryEndpoint>
{
    public DeleteCategorySummary()
    {
        Summary = "Delete a category";
        Description = "Removes the category. Transactions filed under it are kept and become "
            + "uncategorised rather than being deleted along with it.";
        Params["id"] = "The category id.";
        Responses[204] = "The category is gone.";
        Responses[404] = "No such category is visible to the signed-in user.";
    }
}
