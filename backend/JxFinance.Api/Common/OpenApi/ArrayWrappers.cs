using Microsoft.OpenApi;

namespace JxFinance.Common.OpenApi;

public static class ArrayWrappers
{
    public static void Inline(OpenApiDocument document)
    {
        var schemas = document.Components?.Schemas;
        if (schemas is null) return;

        var wrappers = schemas
            .Where(entry => entry.Value is OpenApiSchema { Type: JsonSchemaType.Array, Items: not null })
            .ToDictionary(entry => entry.Key, entry => (OpenApiSchema)entry.Value, StringComparer.Ordinal);
        if (wrappers.Count == 0) return;

        foreach (var name in wrappers.Keys)
        {
            schemas.Remove(name);
        }

        SchemaRewriter.Rewrite(document, schema => Inlined(schema, wrappers));
    }

    private static IOpenApiSchema Inlined(IOpenApiSchema schema, Dictionary<string, OpenApiSchema> wrappers)
    {
        if (WrapperFor(schema, wrappers) is { } wrapper)
        {
            return Copy(wrapper, nullable: false, description: null);
        }

        if (schema is OpenApiSchema { OneOf: { Count: 2 } options } union
            && options.Any(option => option is OpenApiSchema { Type: JsonSchemaType.Null })
            && options.Select(option => WrapperFor(option, wrappers)).FirstOrDefault(found => found is not null) is { } nullableWrapper)
        {
            return Copy(nullableWrapper, nullable: true, union.Description);
        }

        return schema;
    }

    private static OpenApiSchema? WrapperFor(IOpenApiSchema schema, Dictionary<string, OpenApiSchema> wrappers) =>
        schema is OpenApiSchemaReference { Reference.Id: { } id } && wrappers.TryGetValue(id, out var wrapper) ? wrapper : null;

    private static OpenApiSchema Copy(OpenApiSchema wrapper, bool nullable, string? description)
    {
        var copy = (OpenApiSchema)wrapper.CreateShallowCopy();
        if (nullable)
        {
            copy.Type = JsonSchemaType.Null | JsonSchemaType.Array;
        }

        if (!string.IsNullOrWhiteSpace(description))
        {
            copy.Description = description;
        }

        return copy;
    }
}
