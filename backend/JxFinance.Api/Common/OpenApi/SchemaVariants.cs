using System.Text.RegularExpressions;
using Microsoft.OpenApi;

namespace JxFinance.Common.OpenApi;

public static partial class SchemaVariants
{
    public static void Collapse(OpenApiDocument document)
    {
        var schemas = document.Components?.Schemas;
        if (schemas is null) return;

        var canonical = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (name, schema) in schemas)
        {
            var match = VariantSuffix().Match(name);
            if (!match.Success) continue;

            var canonicalName = match.Groups["name"].Value;
            if (schemas.TryGetValue(canonicalName, out var original) && DescribesTheSameValues(schema, original))
            {
                canonical[name] = canonicalName;
            }
        }

        if (canonical.Count == 0) return;

        PromoteAgreedDescriptions(schemas, canonical);
        RepointProperties(document, schemas, canonical);

        foreach (var name in canonical.Keys)
        {
            schemas.Remove(name);
        }
    }

    private static void PromoteAgreedDescriptions(
        IDictionary<string, IOpenApiSchema> schemas,
        Dictionary<string, string> canonical)
    {
        var descriptions = canonical
            .GroupBy(variant => variant.Value, variant => schemas[variant.Key].Description)
            .Select(group => (Name: group.Key, Candidates: group
                .Where(description => !string.IsNullOrWhiteSpace(description))
                .Distinct(StringComparer.Ordinal)
                .ToList()))
            .Where(group => group.Candidates.Count == 1)
            .ToDictionary(group => group.Name, group => group.Candidates[0]!, StringComparer.Ordinal);

        foreach (var (name, description) in descriptions)
        {
            if (schemas[name] is OpenApiSchema schema && string.IsNullOrWhiteSpace(schema.Description))
            {
                schema.Description = description;
            }
        }
    }

    private static void RepointProperties(
        OpenApiDocument document,
        IDictionary<string, IOpenApiSchema> schemas,
        Dictionary<string, string> canonical)
    {
        foreach (var schema in schemas.Values.OfType<OpenApiSchema>())
        {
            if (schema.Properties is null) continue;

            foreach (var (name, property) in schema.Properties.ToList())
            {
                if (property is not OpenApiSchemaReference reference) continue;
                if (reference.Reference.Id is not { } id || !canonical.TryGetValue(id, out var canonicalName)) continue;

                schema.Properties[name] = new OpenApiSchemaReference(canonicalName, document);
            }
        }
    }

    private static bool DescribesTheSameValues(IOpenApiSchema variant, IOpenApiSchema original) =>
        variant.Type == original.Type
        && variant.Format == original.Format
        && EnumValuesMatch(variant, original);

    private static bool EnumValuesMatch(IOpenApiSchema variant, IOpenApiSchema original)
    {
        if (variant.Enum is null || original.Enum is null) return variant.Enum is null && original.Enum is null;

        return variant.Enum.Count == original.Enum.Count
            && variant.Enum
                .Select(value => value?.ToJsonString())
                .SequenceEqual(original.Enum.Select(value => value?.ToJsonString()));
    }

    [GeneratedRegex(@"^(?<name>.+?)__op[0-9A-Fa-f]+$", RegexOptions.CultureInvariant)]
    private static partial Regex VariantSuffix();
}
