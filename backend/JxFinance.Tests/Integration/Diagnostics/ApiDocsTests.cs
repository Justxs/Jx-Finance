using System.Diagnostics;
using System.Net;
using System.Runtime.CompilerServices;
using System.Text.Json.Nodes;
using JxFinance.Common.Errors;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection<IntegrationCollection>]
public sealed class ApiDocsTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private static readonly string[] LeakedCollectionPrefixes = ["IReadOnlyListOf", "IEnumerableOf", "ListOf", "IListOf", "ICollectionOf"];

    [Fact]
    public async Task Root_redirects_to_scalar_docs()
    {
        var response = await Client.GetAsync("/");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/scalar/v1", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task OpenApi_document_matches_the_approved_contract()
    {
        var path = SnapshotPath();
        Assert.True(File.Exists(path), "No approved contract. Run 'just gen'.");
        var actual = WithoutServers(JsonNode.Parse(await Client.GetStringAsync("/openapi/v1.json"))!);
        var approved = WithoutServers(JsonNode.Parse(await File.ReadAllTextAsync(path))!);

        Assert.True(
            JsonNode.DeepEquals(approved, actual),
            "The API contract changed. Run 'just gen', review the difference in the contract and the generated client, then commit both.");
    }

    [Fact]
    public async Task OpenApi_schema_names_do_not_leak_implementation_details()
    {
        var document = JsonNode.Parse(await Client.GetStringAsync("/openapi/v1.json"))!;
        var names = document["components"]!["schemas"]!.AsObject().Select(schema => schema.Key).ToList();

        Assert.NotEmpty(names);
        Assert.DoesNotContain(names, name => name.Contains("__op", StringComparison.Ordinal));
        Assert.DoesNotContain(names, name => LeakedCollectionPrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.Ordinal)));
    }

    [Fact]
    public async Task OpenApi_document_publishes_the_closed_set_of_error_codes()
    {
        var document = JsonNode.Parse(await Client.GetStringAsync("/openapi/v1.json"))!;
        var schemas = document["components"]!["schemas"]!;
        var published = schemas["ErrorCode"]!["enum"]!.AsArray().Select(code => code!.GetValue<string>()).ToList();

        Assert.Equal(ErrorCodes.All, published);
        Assert.Equal(
            "#/components/schemas/ErrorCode",
            schemas["ProblemDetails"]!["properties"]!["errors"]!["items"]!["properties"]!["code"]!["$ref"]!.GetValue<string>());
    }

    [Fact]
    public async Task OpenApi_document_is_valid_according_to_hidi()
    {
        var file = Path.Combine(Path.GetTempPath(), $"jx-openapi-{Guid.NewGuid():N}.json");
        await File.WriteAllTextAsync(file, await Client.GetStringAsync("/openapi/v1.json"));
        try
        {
            var (exitCode, output) = await RunHidiAsync("validate", "-d", file, "--ll", "Warning");

            Assert.True(
                exitCode == 0 && !output.Contains("fail:", StringComparison.Ordinal),
                $"hidi validate exited with {exitCode}. Run 'dotnet tool restore' in backend if the tool is missing.{Environment.NewLine}{output}");
        }
        finally
        {
            File.Delete(file);
        }
    }

    private static async Task<(int ExitCode, string Output)> RunHidiAsync(params string[] arguments)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = ToolManifestDirectory(),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        start.ArgumentList.Add("hidi");
        foreach (var argument in arguments)
            start.ArgumentList.Add(argument);

        using var process = Process.Start(start)!;
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        return (process.ExitCode, await output + await error);
    }

    private static string ToolManifestDirectory([CallerFilePath] string testFile = "")
    {
        var directory = new DirectoryInfo(Path.GetDirectoryName(testFile)!);
        while (!File.Exists(Path.Combine(directory.FullName, "dotnet-tools.json")))
            directory = directory.Parent ?? throw new InvalidOperationException("dotnet-tools.json was not found above the test project.");
        return directory.FullName;
    }

    private static JsonNode WithoutServers(JsonNode document)
    {
        document.AsObject().Remove("servers");
        return document;
    }

    private static string SnapshotPath([CallerFilePath] string testFile = "")
    {
        var directory = new DirectoryInfo(Path.GetDirectoryName(testFile)!);
        while (!File.Exists(Path.Combine(directory.FullName, "frontend", "openapi.json")))
            directory = directory.Parent ?? throw new InvalidOperationException("frontend/openapi.json was not found above the test project. Run 'just gen'.");
        return Path.Combine(directory.FullName, "frontend", "openapi.json");
    }
}
