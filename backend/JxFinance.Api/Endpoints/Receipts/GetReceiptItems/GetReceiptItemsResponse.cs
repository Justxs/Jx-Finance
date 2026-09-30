using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Receipts.GetReceiptItems;

public sealed record GetReceiptItemsResponse(IReadOnlyList<ReceiptItemSpend> Items, int Receipts)
{
    public const int MaxItems = 50;
}

public sealed record ReceiptItemSpend(
    string Key,
    string Name,
    Currency Currency,
    [property: Money] decimal Amount,
    int Count,
    DateOnly LastBought);
