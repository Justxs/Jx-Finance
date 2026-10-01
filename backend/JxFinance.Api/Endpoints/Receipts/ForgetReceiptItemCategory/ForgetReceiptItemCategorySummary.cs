using FastEndpoints;

namespace JxFinance.Endpoints.Receipts.ForgetReceiptItemCategory;

public sealed class ForgetReceiptItemCategorySummary : Summary<ForgetReceiptItemCategoryEndpoint>
{
    public ForgetReceiptItemCategorySummary()
    {
        Summary = "Forget a remembered receipt item category";
        Description = "Removes one remembered category for good, so the next receipt with an item of that name takes "
            + "the category of your first matching categorization rule, or none. Readings already stored and "
            + "transactions keep what they have.";
        Params["id"] = "The remembered entry's id.";
        Responses[204] = "The entry is forgotten.";
        Responses[404] = "No such entry belongs to you, or the receiptReading feature is switched off (feature.disabled).";
    }
}
