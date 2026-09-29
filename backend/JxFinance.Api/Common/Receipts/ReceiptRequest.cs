using System.Globalization;
using System.Text;

namespace JxFinance.Common.Receipts;

public sealed record ReceiptRequest(ReceiptInput Input, string ApiKey, string Model, IReadOnlyList<string> CategoryNames)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"MediaType = {Input.MediaType}, ApiKey = {SecretText.Hidden}, Model = {Model}, Categories = {CategoryNames.Count}");
        return true;
    }
}
