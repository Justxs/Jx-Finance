using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using FastEndpoints;
using FastEndpoints.Mcp;
using JxFinance.Common.Middleware;
using JxFinance.Common.Settings;
using JxFinance.Infrastructure.Auth;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace JxFinance.Common.Mcp;

public static class McpTools
{
    public const string Path = "/api/mcp";

    public static void OptIn(EndpointDefinition definition)
    {
        var method = definition.Verbs[0];
        if (definition.AllowedRoles is { Count: > 0 }
            || (HttpMethods.IsGet(method) && definition.ResDtoType == typeof(object))
            || PersonalApiTokenGateMiddleware.Refusal(method, canWrite: true, definition.EndpointMetadata) is not null)
        {
            return;
        }

        definition.McpTool(NameOf(definition), configure: tool =>
        {
            tool.Title = definition.EndpointSummary?.Summary;
            tool.Hints.ReadOnly = HttpMethods.IsGet(method);
            tool.Hints.Idempotent = !HttpMethods.IsPost(method) && !HttpMethods.IsPatch(method);
            tool.Hints.Destructive = HttpMethods.IsPut(method) || HttpMethods.IsDelete(method) ? true : null;
            tool.Hints.OpenWorld = false;
        });
    }

    public static void Configure(McpOptions options) =>
        options.ToolVisibilityFilter = (definition, caller, context) =>
            IsVisible(definition, caller, context.RequestServices.GetRequiredService<IInstanceSettingsStore>().Current);

    public static void ConfigureRoute(IEndpointConventionBuilder route) =>
        route.RequireAuthorization().WithMetadata(McpRoute.Instance).ExcludeFromDescription();

    public static bool IsVisible(EndpointDefinition definition, ClaimsPrincipal caller, InstanceSettingsSnapshot settings) =>
        caller.HasClaim(claim => claim.Type == AuthClaims.TokenId)
        && definition.EndpointMetadata?.OfType<RequiresFeature>().All(required => settings.IsEnabled(required.Feature)) is not false
        && PersonalApiTokenGateMiddleware.Refusal(
            definition.Verbs[0],
            caller.HasClaim(AuthClaims.TokenAccess, nameof(TokenAccess.ReadWrite)),
            definition.EndpointMetadata) is null;

    public static McpRequestHandler<ListToolsRequestParams, ListToolsResult> DescribeArguments(
        McpRequestHandler<ListToolsRequestParams, ListToolsResult> next) =>
        async (context, cancellationToken) =>
        {
            var result = await next(context, cancellationToken);
            var parametersByTool = context.Services!.GetRequiredService<EndpointDataSource>().Endpoints
                .Select(endpoint => endpoint.Metadata.GetMetadata<EndpointDefinition>())
                .OfType<EndpointDefinition>()
                .Where(definition => definition.EndpointMetadata?.OfType<McpToolInfo>().Any() is true)
                .Distinct()
                .ToDictionary(NameOf, definition => definition.EndpointSummary?.Params ?? []);

            for (var i = 0; i < result.Tools.Count; i++)
            {
                if (parametersByTool.TryGetValue(result.Tools[i].Name, out var parameters) && parameters.Count > 0)
                {
                    result.Tools[i] = WithArgumentDescriptions(result.Tools[i], parameters);
                }
            }

            return result;
        };

    private static string NameOf(EndpointDefinition definition) =>
        JsonNamingPolicy.SnakeCaseLower.ConvertName(definition.EndpointType.Name.Replace("Endpoint", string.Empty, StringComparison.Ordinal));

    private static Tool WithArgumentDescriptions(Tool tool, Dictionary<string, string> parameters)
    {
        var schema = JsonSerializer.SerializeToNode(tool.InputSchema);
        if (schema?["properties"] is JsonObject properties)
        {
            foreach (var (name, property) in properties)
            {
                if (property is JsonObject argument
                    && argument["description"] is null
                    && parameters.GetValueOrDefault(char.ToUpperInvariant(name[0]) + name[1..]) is { } description)
                {
                    argument["description"] = description;
                }
            }
        }

        return new Tool
        {
            Name = tool.Name,
            Title = tool.Title,
            Description = tool.Description,
            InputSchema = JsonSerializer.SerializeToElement(schema),
            OutputSchema = tool.OutputSchema,
            Annotations = tool.Annotations,
            Icons = tool.Icons,
            Meta = tool.Meta,
        };
    }
}
