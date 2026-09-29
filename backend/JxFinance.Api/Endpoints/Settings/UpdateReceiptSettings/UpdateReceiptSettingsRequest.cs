using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Settings.UpdateReceiptSettings;

public sealed record UpdateReceiptSettingsRequest(bool Enabled, string? ApiKey, string Model, int MonthlyLimit)
{
    public const int ApiKeyMaxLength = 500;

    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Enabled = {Enabled}, ApiKey = {SecretText.Hidden}, Model = {Model}, MonthlyLimit = {MonthlyLimit}");
        return true;
    }
}
