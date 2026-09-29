using System.Globalization;
using System.Text.Json;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;

namespace JxFinance.Infrastructure.Receipts;

public static class ReceiptAnswer
{
    public static readonly DomainError Unreadable = new(
        ErrorCodes.ReceiptUnreadable,
        "The receipt could not be read. Take a sharper, straight photo of the whole receipt and try again.");

    public static Result<ReceiptExtraction> Parse(string json, ReceiptInput input, int categoryCount, int inputTokens, int outputTokens)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            var items = root.GetProperty("items");
            var adjustments = root.GetProperty("adjustments");
            if (items.GetArrayLength() > ReceiptResult.MaxItems || adjustments.GetArrayLength() > ReceiptResult.MaxAdjustments)
            {
                return Unreadable;
            }

            var parsedItems = items.EnumerateArray().Select(ParseItem).ToList();
            var parsedAdjustments = adjustments.EnumerateArray().Select(ParseAdjustment).ToList();
            var total = OptionalAmount(root.GetProperty("total"));
            if (parsedItems.Any(item => item is null) || parsedAdjustments.Any(adjustment => adjustment is null) || total is { IsValid: false })
            {
                return Unreadable;
            }

            var result = new ReceiptResult(
                OptionalText(root.GetProperty("merchant"), ReceiptResult.TextMaxLength),
                DateOnly.TryParseExact(OptionalText(root.GetProperty("date"), 10), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null,
                CurrencyCode.TryParse(OptionalText(root.GetProperty("currency"), 10), out var currency) ? currency : null,
                total?.Value,
                root.GetProperty("isReturn").GetBoolean(),
                input.PagesRead,
                input.PageCount,
                [.. parsedItems.Select(item => item!.Value.Item)],
                [.. parsedAdjustments.Select(adjustment => adjustment!)]);
            var categories = parsedItems
                .Select(item => item!.Value.Category is { } number && number >= 1 && number <= categoryCount ? number : (int?)null)
                .ToList();

            return new ReceiptExtraction(result, categories, inputTokens, outputTokens);
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException or FormatException)
        {
            return Unreadable;
        }
    }

    private static (ReceiptItem Item, int? Category)? ParseItem(JsonElement item)
    {
        var amount = Amount(item.GetProperty("amount"));
        var discount = Amount(item.GetProperty("discount"));
        var deposit = Amount(item.GetProperty("deposit"));
        var name = TextLimit.Cut(item.GetProperty("name").GetString() ?? "", ReceiptResult.TextMaxLength);
        if (amount is not >= 0 || discount is not >= 0 || deposit is not >= 0 || name.Length == 0)
        {
            return null;
        }

        var category = item.GetProperty("category");
        return (
            new ReceiptItem(
                name,
                OptionalText(item.GetProperty("quantity"), ReceiptResult.QuantityMaxLength),
                amount.Value,
                discount.Value,
                deposit.Value),
            category.ValueKind == JsonValueKind.Number && category.TryGetInt32(out var number) ? number : null);
    }

    private static ReceiptAdjustment? ParseAdjustment(JsonElement adjustment)
    {
        var amount = Amount(adjustment.GetProperty("amount"));
        var kind = Enum.TryParse<ReceiptAdjustmentKind>(adjustment.GetProperty("kind").GetString(), ignoreCase: true, out var parsed)
            ? parsed
            : ReceiptAdjustmentKind.Other;
        return amount is { } value
            ? new ReceiptAdjustment(kind, TextLimit.Cut(adjustment.GetProperty("label").GetString() ?? "", ReceiptResult.TextMaxLength), value)
            : null;
    }

    private static decimal? Amount(JsonElement value) =>
        value.ValueKind == JsonValueKind.Number
            && value.TryGetDecimal(out var amount)
            && DecimalRules.FitsMoney(amount)
            ? amount
            : null;

    private static (bool IsValid, decimal? Value)? OptionalAmount(JsonElement value) =>
        value.ValueKind == JsonValueKind.Null ? null : Amount(value) is { } amount ? (true, amount) : (false, null);

    private static string? OptionalText(JsonElement value, int maxLength) =>
        value.ValueKind == JsonValueKind.String && value.GetString() is { } text && text.Trim().Length > 0
            ? TextLimit.Cut(text, maxLength)
            : null;
}
