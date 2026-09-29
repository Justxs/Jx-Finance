using FastEndpoints;
using JxFinance.Domain.Receipts;

namespace JxFinance.Endpoints.Settings.UpdateReceiptSettings;

public sealed class UpdateReceiptSettingsSummary : Summary<UpdateReceiptSettingsEndpoint, UpdateReceiptSettingsRequest>
{
    public UpdateReceiptSettingsSummary()
    {
        Summary = "Save the receipt reading settings";
        Description = "Stores whether receipt reading is enabled, the Anthropic API key, the model and the monthly "
            + "limit on reads for the whole installation. The key is encrypted with ASP.NET Data Protection before it "
            + "is stored and is never returned: the answer carries hasKey instead. An empty apiKey keeps the stored "
            + "one. Switching enabled on without any key answers 400 required on apiKey. The model must be one of "
            + "claude-sonnet-5 (the default), claude-haiku-4-5 or claude-opus-5-5; any other answers 400 "
            + "receipt.modelNotAllowed. The limit is between 1 and 10000. Reading also needs the ReceiptReading "
            + "feature switch. Administrators only.";
        ExampleRequest = new UpdateReceiptSettingsRequest(true, "sk-ant-api03-example", ReceiptModels.Default, 100);
        RequestParam(r => r.ApiKey, "Leave empty to keep the stored key.");
        Responses[200] = "The saved settings, without the key.";
        Responses[400] = "Invalid settings, required on apiKey, or receipt.modelNotAllowed.";
        Responses[403] = "Only administrators can change installation settings.";
    }
}
