using FastEndpoints;

namespace JxFinance.Endpoints.Receipts.UpdateReceiptCategories;

public sealed class UpdateReceiptCategoriesSummary : Summary<UpdateReceiptCategoriesEndpoint, UpdateReceiptCategoriesRequest>
{
    public UpdateReceiptCategoriesSummary()
    {
        Summary = "Keep the categories chosen for a receipt's items";
        Description = "Stores the category the caller chose for each listed item of one of their readings, and "
            + "remembers it for that item's name, so the next receipt with the same item gets it before any "
            + "categorization rule is tried. An item set to no category forgets its name. Names are compared after "
            + "lowercasing and dropping diacritics, digits, units and punctuation. Nothing in the ledger changes: the "
            + "split itself is saved with the transaction. Every category must be an expense category the caller can see.";
        Params["id"] = "The reading id.";
        Responses[204] = "The choices are stored.";
        Responses[400] = "An item index outside the reading (range.invalid), or a category that is not a visible "
            + "expense category (reference.notFound, category.wrongType).";
        Responses[404] = "No such reading belongs to the caller, or the feature is switched off (feature.disabled).";
    }
}
