using FastEndpoints;

namespace JxFinance.Endpoints.Settings.TestReceiptKey;

public sealed class TestReceiptKeySummary : Summary<TestReceiptKeyEndpoint>
{
    public TestReceiptKeySummary()
    {
        Summary = "Test the stored Anthropic API key";
        Description = "Asks Anthropic's Models API for the chosen model with the key that is stored right now. This "
            + "costs nothing and reads no receipt. Save the settings before testing them. Answers 400 "
            + "receipt.keyRejected when Anthropic refuses the key, receipt.keyUnreadable when the stored key cannot "
            + "be decrypted, which is what a restore into an installation with different data protection keys leaves "
            + "behind, receipt.notConfigured when no key is stored, and 502 receipt.providerFailed when Anthropic "
            + "cannot be reached or does not offer the model. Rate limited to 10 calls per five minutes per client. "
            + "Administrators only.";
        Responses[204] = "Anthropic accepted the key and offers the model.";
        Responses[400] = "The key was refused, cannot be read, or none is stored.";
        Responses[403] = "Only administrators can test the key.";
        Responses[429] = "Too many tests from this client; wait and retry.";
        Responses[502] = "Anthropic could not be reached or does not offer the model.";
    }
}
