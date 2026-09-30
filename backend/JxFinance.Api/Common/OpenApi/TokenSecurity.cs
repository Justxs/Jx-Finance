using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace JxFinance.Common.OpenApi;

public static class TokenSecurity
{
    public const string SchemeName = "PersonalApiToken";

    private const string TokenMarker = "x-jx-token";

    public static Task MarkReadable(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        if (HttpMethods.IsGet(context.Description.HttpMethod ?? string.Empty)
            && TokenReadable.Allows(metadata)
            && !metadata.OfType<IAllowAnonymous>().Any())
        {
            Mark(operation);
        }

        return Task.CompletedTask;
    }

    public static Task MarkWritable(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        if (!HttpMethods.IsGet(context.Description.HttpMethod ?? string.Empty)
            && TokenWritable.Allows(context.Description.ActionDescriptor.EndpointMetadata))
        {
            Mark(operation);
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
            Description = "Personal API token (jxp_...) created in Settings > Personal > Security. "
                + "Accepted only on the operations that list it, while the ApiTokens feature is on: every token on the GET operations, "
                + "a read-and-write token also on the writes. Anything else answers 403 token.notAllowed. "
                + "A POST may carry Idempotency-Key (1 to 64 visible characters) so a retry within 24 hours returns the first answer. "
                + "At most 60 requests a minute per token.",
        };

        var operations = document.Paths?.Values.SelectMany(path => path.Operations?.Values.AsEnumerable() ?? []) ?? [];
        foreach (var operation in operations.Where(o => o.Extensions?.Remove(TokenMarker) is true))
        {
            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference(SchemeName, document)] = [] });
        }
    }

    private static void Mark(OpenApiOperation operation)
    {
        operation.Extensions ??= new Dictionary<string, IOpenApiExtension>();
        operation.Extensions[TokenMarker] = new JsonNodeExtension(JsonValue.Create(true));
    }
}
