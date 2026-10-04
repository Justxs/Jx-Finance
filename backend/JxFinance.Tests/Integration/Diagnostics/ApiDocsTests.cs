using System.Diagnostics;
using System.Net;
using System.Text.Json.Nodes;
using JxFinance.Common.Errors;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection<NotificationsCollection>]
public sealed class ApiDocsTests(NotificationsFixture fixture) : IntegrationTestBase(fixture)
{
    private static readonly string[] LeakedCollectionPrefixes = ["IReadOnlyListOf", "IEnumerableOf", "ListOf", "IListOf", "ICollectionOf"];

    [Fact]
    public async Task Root_redirects_to_scalar_docs()
    {
        var response = await Client.GetAsync("/", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/scalar/v1", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task OpenApi_schema_names_do_not_leak_implementation_details()
    {
        var document = JsonNode.Parse(await Client.GetStringAsync("/openapi/v1.json", TestContext.Current.CancellationToken))!;
        var names = document["components"]!["schemas"]!.AsObject().Select(schema => schema.Key).ToList();

        Assert.NotEmpty(names);
        Assert.DoesNotContain(names, name => name.Contains("__op", StringComparison.Ordinal));
        Assert.DoesNotContain(names, name => LeakedCollectionPrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.Ordinal)));
    }

    [Fact]
    public async Task OpenApi_document_publishes_the_closed_set_of_error_codes()
    {
        var document = JsonNode.Parse(await Client.GetStringAsync("/openapi/v1.json", TestContext.Current.CancellationToken))!;
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
        await File.WriteAllTextAsync(file, await Client.GetStringAsync("/openapi/v1.json", TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);
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
            WorkingDirectory = Path.GetDirectoryName(RepoPath.Of("dotnet-tools.json"))!,
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
}
