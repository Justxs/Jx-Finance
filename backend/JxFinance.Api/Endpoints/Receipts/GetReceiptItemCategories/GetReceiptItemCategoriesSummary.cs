using FastEndpoints;

namespace JxFinance.Endpoints.Receipts.GetReceiptItemCategories;

public sealed class GetReceiptItemCategoriesSummary
    : Summary<GetReceiptItemCategoriesEndpoint, GetReceiptItemCategoriesRequest>
{
    public GetReceiptItemCategoriesSummary()
    {
        Summary = "List your remembered receipt item categories";
        Description = "Lists the categories receipt reading remembers for you per item name: each entry has the normalized "
            + "item name it matches (lower case, without accents, digits or units), the category, which may since have "
            + "been deleted or stopped being shared with you, and when you last filed an item of that name. Most recently "
            + "used first, at most 100, with total counting every entry that matches. Not readable with a personal API token.";
        RequestParam(r => r.Search, "Optional text the normalized item name must contain, ignoring case and accents.");
        Responses[200] = "The remembered items and how many match.";
        Responses[400] = "The search is longer than 100 characters (text.tooLong).";
        Responses[404] = "The receiptReading feature is switched off (feature.disabled).";
    }
}
