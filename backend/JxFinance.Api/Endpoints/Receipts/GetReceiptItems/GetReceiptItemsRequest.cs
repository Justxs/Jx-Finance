namespace JxFinance.Endpoints.Receipts.GetReceiptItems;

public sealed class GetReceiptItemsRequest
{
    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }

    public string? Search { get; init; }
}
