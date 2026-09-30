using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;

public sealed record UpdateMarketPriceSettingsRequest(bool Enabled, string? EodhdApiKey = null)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Enabled = {Enabled}, EodhdApiKey = {SecretText.Hidden}");
        return true;
    }
}
