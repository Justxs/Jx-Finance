using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace JxFinance.Common.OpenApi;

public static class TokenSecurity
{
    public const string SchemeName = "PersonalApiToken";

    private const string ReadableMarker = "x-jx-token-readable";

    public static Task MarkReadable(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        if (HttpMethods.IsGet(context.Description.HttpMethod ?? string.Empty)
            && TokenReadable.Allows(metadata)
            && !metadata.OfType<IAllowAnonymous>().Any())
        {
            operation.Extensions ??= new Dictionary<string, IOpenApiExtension>();
            operation.Extensions[ReadableMarker] = new JsonNodeExtension(JsonValue.Create(true));
        }

        return Task.CompletedTask;
    }

    public static void Describe(OpenApiDocument document)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[SchemeName] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            Description = "Read-only personal API token (jxp_...) created in Settings > Personal > Security. "
                + "Accepted only on the GET operations that list it, while the ApiTokens feature is on; "
                + "anything else answers 403 token.notAllowed. At most 60 requests a minute per token.",
        };

        var operations = document.Paths?.Values.SelectMany(path => path.Operations?.Values.AsEnumerable() ?? []) ?? [];
        foreach (var operation in operations.Where(o => o.Extensions?.Remove(ReadableMarker) is true))
        {
            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference(SchemeName, document)] = [] });
        }
    }
}
