using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetReceiptSettings;

public sealed class GetReceiptSettingsSummary : Summary<GetReceiptSettingsEndpoint>
{
    public GetReceiptSettingsSummary()
    {
        Summary = "Read the receipt reading settings";
        Description = "Answers whether receipt reading is enabled, whether an Anthropic API key is stored, the chosen "
            + "model, the monthly limit on reads for the whole installation and how many reads this month has used. "
            + "The key itself is never part of the answer. Administrators only.";
        Responses[200] = "The receipt reading settings, without the key.";
        Responses[403] = "Only administrators can read the receipt reading settings.";
    }
}
