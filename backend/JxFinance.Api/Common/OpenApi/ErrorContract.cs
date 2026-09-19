using System.Text.Json.Nodes;
using JxFinance.Common.Errors;
using Microsoft.OpenApi;

namespace JxFinance.Common.OpenApi;

public static class ErrorContract
{
    public const string ErrorCodeSchema = "ErrorCode";

    private const string ProblemDetailsSchema = "ProblemDetails";
    private const string CodeProperty = "code";
    private const string ErrorsProperty = "errors";

    public static void Describe(OpenApiDocument document)
    {
        var schemas = document.Components?.Schemas;
        if (schemas is null || !schemas.TryGetValue(ProblemDetailsSchema, out var found) || found is not OpenApiSchema problem) return;

        schemas[ErrorCodeSchema] = new OpenApiSchema
        {
            Type = JsonSchemaType.String,
            Description = "Stable machine-readable reason for a failure. Translate it on the client; the reason text is an English fallback.",
            Enum = ErrorCodes.All.Select(code => (JsonNode)JsonValue.Create(code)).ToList(),
        };

        problem.Properties ??= new Dictionary<string, IOpenApiSchema>(StringComparer.Ordinal);
        problem.Properties[CodeProperty] = new OpenApiSchemaReference(ErrorCodeSchema, document)
        {
            Description = "Set when the problem has no errors entries, for example feature.disabled.",
        };

        if (problem.Properties.TryGetValue(ErrorsProperty, out var errors)
            && errors is OpenApiSchema { Items: OpenApiSchema { Properties: { } item } })
        {
            item[CodeProperty] = new OpenApiSchemaReference(ErrorCodeSchema, document)
            {
                Description = "The kind of failure. The name says which field it concerns.",
            };
        }
    }
}
