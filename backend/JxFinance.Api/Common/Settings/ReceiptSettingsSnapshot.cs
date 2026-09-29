using System.Globalization;
using System.Text;
using JxFinance.Domain.Receipts;
using JxFinance.Domain.Settings;

namespace JxFinance.Common.Settings;

public sealed record ReceiptSettingsSnapshot(bool Enabled, string ProtectedApiKey, string Model, int MonthlyLimit)
{
    public bool HasKey => ProtectedApiKey.Length > 0;

    public static ReceiptSettingsSnapshot From(InstanceSettings settings) => new(
        settings.ReceiptReadingEnabled,
        settings.ReceiptApiKeyProtected,
        ReceiptModels.IsAllowed(settings.ReceiptModel) ? settings.ReceiptModel : ReceiptModels.Default,
        settings.ReceiptMonthlyLimit);

    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Enabled = {Enabled}, ProtectedApiKey = {SecretText.Hidden}, Model = {Model}, MonthlyLimit = {MonthlyLimit}");
        return true;
    }
}
