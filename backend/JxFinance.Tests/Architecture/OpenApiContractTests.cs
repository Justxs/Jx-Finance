using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed class OpenApiContractTests
{
    [Fact]
    public async Task OpenApi_document_matches_the_approved_contract()
    {
        var path = RepoPath.Of(Path.Combine("frontend", "openapi.json"));
        Assert.True(File.Exists(path), "No approved contract. Run 'just gen'.");
        using var client = FastEndpointsPipeline.CreateClient();
        var actual = WithoutServers(JsonNode.Parse(await client.GetStringAsync("/openapi/v1.json", TestContext.Current.CancellationToken))!);
        var approved = WithoutServers(JsonNode.Parse(await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken))!);

        Assert.True(
            JsonNode.DeepEquals(approved, actual),
            "The API contract changed. Run 'just gen', review the difference in the contract and the generated client, then commit both.");
    }

    private static JsonNode WithoutServers(JsonNode document)
    {
        document.AsObject().Remove("servers");
        return document;
    }
}
