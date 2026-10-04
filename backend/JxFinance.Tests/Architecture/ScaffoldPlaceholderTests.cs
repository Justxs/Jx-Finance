using System.Text.RegularExpressions;
using FastEndpoints;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed partial class ScaffoldPlaceholderTests
{
    private const string PlaceholderDescription = "Describe what this does and when to call it.";
    private const string PlaceholderParameter = "The id.";
    private const string PlaceholderSuccess = "Succeeded.";

    [Fact]
    public void No_endpoint_summary_keeps_the_scaffold_text()
    {
        var leftovers = FastEndpointsPipeline.Endpoints
            .Select(endpoint => endpoint.Metadata.GetMetadata<EndpointDefinition>()!)
            .Distinct()
            .SelectMany(definition => Placeholders(definition)
                .Select(placeholder =>
                    $"{SummaryFile(definition)} still has the 'just new-endpoint' placeholder {placeholder}. Write what the endpoint does, its parameters and its answers; the text is the OpenAPI description and the MCP tool title."))
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.True(leftovers.Count == 0, string.Join(Environment.NewLine, leftovers));
    }

    [Fact]
    public void No_endpoint_or_service_keeps_the_scaffold_body()
    {
        var endpoints = RepoPath.Of(Path.Combine("JxFinance.Api", "Endpoints"));
        var services = $"{Path.DirectorySeparatorChar}Services{Path.DirectorySeparatorChar}";
        var leftovers = Directory
            .EnumerateFiles(endpoints, "*.cs", SearchOption.AllDirectories)
            .Where(file => file.EndsWith("Endpoint.cs", StringComparison.Ordinal) || file.Contains(services, StringComparison.Ordinal))
            .Where(file => ScaffoldHandler().IsMatch(File.ReadAllText(file)))
            .Select(file =>
                $"Endpoints/{Path.GetRelativePath(endpoints, file).Replace(Path.DirectorySeparatorChar, '/')} still answers with the 'just new-endpoint' placeholder body. Put the real behaviour in the service and call it through its interface.")
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.True(leftovers.Count == 0, string.Join(Environment.NewLine, leftovers));
    }

    private static IEnumerable<string> Placeholders(EndpointDefinition definition)
    {
        var summary = definition.EndpointSummary;
        if (summary is null)
        {
            yield break;
        }

        if (summary.Summary == ShortName(definition))
        {
            yield return $"Summary = \"{summary.Summary}\"";
        }

        if (summary.Description?.Contains(PlaceholderDescription, StringComparison.Ordinal) is true)
        {
            yield return $"Description = \"{PlaceholderDescription}\"";
        }

        foreach (var (name, text) in summary.Params.Where(param => param.Value == PlaceholderParameter))
        {
            yield return $"Params[\"{name}\"] = \"{text}\"";
        }

        foreach (var (status, response) in summary.Responses.Where(response => response.Value == PlaceholderSuccess))
        {
            yield return $"Responses[{status}] = \"{response}\"";
        }
    }

    private static string ShortName(EndpointDefinition definition) =>
        definition.EndpointType.Name.Replace("Endpoint", string.Empty, StringComparison.Ordinal);

    private static string SummaryFile(EndpointDefinition definition) =>
        $"{definition.EndpointType.Namespace!.Replace("JxFinance.", string.Empty, StringComparison.Ordinal).Replace('.', '/')}/{ShortName(definition)}Summary.cs";

    [GeneratedRegex(@"Task\.FromResult<Result<Guid>>\(id\)|Task\.FromResult<Result<\w+Response>>\(new \w+Response\(request\.Id\)\)|Result<\w+Response> result = new \w+Response\(req\.Id\);")]
    private static partial Regex ScaffoldHandler();
}
