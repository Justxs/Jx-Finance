using System.Globalization;
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
        var variants = schemas.Keys
            .Select(name => (Name: name, Match: VariantSuffix().Match(name)))
            .Where(variant => variant.Match.Success)
            .GroupBy(variant => variant.Match.Groups["name"].Value, variant => variant.Name, StringComparer.Ordinal);

        foreach (var group in variants)
        {
            if (schemas.TryGetValue(group.Key, out var original))
            {
                foreach (var name in group.Where(name => DescribesTheSameValues(schemas[name], original)))
                {
                    canonical[name] = group.Key;
                }
            }
            else if (group.Select(name => Json(schemas[name])).Distinct(StringComparer.Ordinal).Count() == 1)
            {
                foreach (var name in group)
                {
                    canonical[name] = group.Key;
                }
            }
        }

        if (canonical.Count == 0) return;

        foreach (var promoted in canonical.GroupBy(variant => variant.Value, variant => variant.Key).Where(group => !schemas.ContainsKey(group.Key)))
        {
            schemas[promoted.Key] = schemas[promoted.First()];
        }

        PromoteAgreedDescriptions(schemas, canonical);

        foreach (var name in canonical.Keys)
        {
            schemas.Remove(name);
        }

        SchemaRewriter.Rewrite(document, schema =>
            schema is OpenApiSchemaReference { Reference.Id: { } id } && canonical.TryGetValue(id, out var canonicalName)
                ? new OpenApiSchemaReference(canonicalName, document)
                : schema);
    }

    private static string Json(IOpenApiSchema schema)
    {
        using var text = new StringWriter(CultureInfo.InvariantCulture);
        schema.SerializeAsV31(new OpenApiJsonWriter(text));
        return text.ToString();
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
