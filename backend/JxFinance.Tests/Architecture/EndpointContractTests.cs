using System.Reflection;
using System.Text.RegularExpressions;
using FastEndpoints;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed partial class EndpointContractTests
{
    private static readonly PropertyInfo HitCounter = typeof(EndpointDefinition)
        .GetProperty("HitCounter", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)!;

    private static readonly string[] BareErrorFiles =
    [
        Path.Combine("Endpoints", "Auth", "Refresh", "RefreshEndpoint.cs"),
    ];

    [Fact]
    public void Every_throttled_endpoint_declares_429()
    {
        var missing = Endpoints()
            .Where(endpoint => HitCounter.GetValue(Definition(endpoint)) is not null && !Declares(endpoint, StatusCodes.Status429TooManyRequests))
            .Select(Name)
            .ToList();

        AssertNone(missing, "These endpoints call Throttle(...) without declaring 429; add Description(d => d.Produces(429)) next to it:");
    }

    [Fact]
    public void Every_endpoint_has_a_summary_and_a_tag_from_its_group()
    {
        var missing = Endpoints()
            .Where(endpoint => Definition(endpoint).EndpointSummary is null
                || endpoint.Metadata.GetMetadata<ITagsMetadata>() is not { Tags.Count: > 0 })
            .Select(Name)
            .ToList();

        AssertNone(missing, "These endpoints lack a summary or a tag; add a <Name>Summary class beside the endpoint and call Group<TagGroup>() in Configure:");
    }

    [Fact]
    public void Authenticated_endpoints_declare_401_and_role_endpoints_declare_403()
    {
        var missing = Endpoints()
            .Where(endpoint =>
            {
                var definition = Definition(endpoint);
                return (definition.AnonymousVerbs is not { Length: > 0 } && !Declares(endpoint, StatusCodes.Status401Unauthorized))
                    || (definition.AllowedRoles is { Count: > 0 } && !Declares(endpoint, StatusCodes.Status403Forbidden));
            })
            .Select(Name)
            .ToList();

        AssertNone(missing, "These endpoints lost the 401 or 403 that ApiPipelineExtensions declares for every endpoint; keep the global defaults when calling Description(...):");
    }

    [Fact]
    public void Endpoints_send_errors_as_problem_details()
    {
        var endpoints = RepoPath.Of(Path.Combine("JxFinance.Api", "Endpoints"));
        var offenders = Directory
            .EnumerateFiles(endpoints, "*Endpoint.cs", SearchOption.AllDirectories)
            .Where(file => !BareErrorFiles.Any(allowed => file.EndsWith(allowed, StringComparison.OrdinalIgnoreCase)))
            .Where(file => BareError().IsMatch(File.ReadAllText(file)))
            .Select(file => Path.GetRelativePath(endpoints, file))
            .ToList();

        AssertNone(offenders, "These endpoints answer through Send.NotFoundAsync, Send.UnauthorizedAsync or Send.ForbiddenAsync; return a DomainError from the service and answer with Send.OkOrProblemAsync or Send.ProblemAsync:");
    }

    private static void AssertNone(List<string> offenders, string fix) =>
        Assert.True(offenders.Count == 0, string.Join(Environment.NewLine, [fix, .. offenders]));

    private static IEnumerable<RouteEndpoint> Endpoints() =>
        FastEndpointsPipeline.Endpoints.Where(endpoint => endpoint.Metadata.GetMetadata<EndpointDefinition>() is not null);

    private static EndpointDefinition Definition(RouteEndpoint endpoint) =>
        endpoint.Metadata.GetMetadata<EndpointDefinition>()!;

    private static bool Declares(RouteEndpoint endpoint, int statusCode) =>
        endpoint.Metadata.OfType<IProducesResponseTypeMetadata>().Any(produces => produces.StatusCode == statusCode);

    private static string Name(RouteEndpoint endpoint) => endpoint.DisplayName ?? endpoint.RoutePattern.RawText ?? "?";

    [GeneratedRegex(@"\bSend\.(NotFound|Unauthorized|Forbidden)Async\(")]
    private static partial Regex BareError();
}
