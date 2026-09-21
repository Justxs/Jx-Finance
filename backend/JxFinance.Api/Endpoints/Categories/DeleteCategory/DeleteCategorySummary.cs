using FastEndpoints;

namespace JxFinance.Endpoints.Categories.DeleteCategory;

public sealed class DeleteCategorySummary : Summary<DeleteCategoryEndpoint>
{
    public DeleteCategorySummary()
    {
        Summary = "Delete a category";
        Description = "Removes the category. Transactions, split lines and recurring entries filed "
            + "under it are kept and become uncategorised, and the budgets on it are deleted with it. "
            + "Which rows it cleared is recorded, so the deletion is listed in the trash and "
            + "POST /api/trash/restore puts the category back on the rows that are still uncategorised.";
        Params["id"] = "The category id.";
        Responses[204] = "The category is gone.";
        Responses[404] = "No such category is visible to the signed-in user.";
    }
}
