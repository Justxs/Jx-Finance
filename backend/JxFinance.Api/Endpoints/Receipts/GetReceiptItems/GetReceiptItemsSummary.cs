using FastEndpoints;

namespace JxFinance.Endpoints.Receipts.GetReceiptItems;

public sealed class GetReceiptItemsSummary : Summary<GetReceiptItemsEndpoint, GetReceiptItemsRequest>
{
    public GetReceiptItemsSummary()
    {
        Summary = "Spending per receipt item";
        Description = "Sums the items of your receipt readings for the attachments of visible transactions dated in the range: "
            + "how much toothpaste cost this year. Items are grouped by their normalized name, the key remembered "
            + "categories use, and by currency; each item counts what the split counts, its amount less its discount "
            + "plus its deposit, never below zero. Only readings you made are counted, so a receipt someone else read "
            + "counts once you read it too. At most 50 items, largest first.";
        RequestParam(r => r.DateFrom, "Inclusive start date as YYYY-MM-DD, against the transaction's date.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD.");
        RequestParam(r => r.Search, "Optional text an item's normalized name must contain, ignoring case and accents.");
        Responses[200] = "The items and how many receipts were read.";
        Responses[400] = "Validation failed.";
        Responses[404] = "The receiptReading feature is switched off (feature.disabled).";
    }
}
