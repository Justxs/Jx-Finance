using Microsoft.OpenApi;

namespace JxFinance.Common.OpenApi;

public static class SchemaRewriter
{
    public static void Rewrite(OpenApiDocument document, Func<IOpenApiSchema, IOpenApiSchema> rewrite)
    {
        if (document.Components?.Schemas is { } schemas)
        {
            foreach (var name in schemas.Keys.ToList())
            {
                schemas[name] = Visit(schemas[name], rewrite);
            }
        }

        foreach (var path in document.Paths.Values)
        {
            RewriteParameters(path.Parameters, rewrite);
            foreach (var operation in path.Operations?.Values.AsEnumerable() ?? [])
            {
                RewriteParameters(operation.Parameters, rewrite);
                RewriteContent((operation.RequestBody as OpenApiRequestBody)?.Content, rewrite);
                foreach (var response in operation.Responses?.Values.OfType<OpenApiResponse>() ?? [])
                {
                    RewriteContent(response.Content, rewrite);
                }
            }
        }
    }

    private static void RewriteParameters(IList<IOpenApiParameter>? parameters, Func<IOpenApiSchema, IOpenApiSchema> rewrite)
    {
        foreach (var parameter in parameters?.OfType<OpenApiParameter>() ?? [])
        {
            if (parameter.Schema is { } schema)
            {
                parameter.Schema = Visit(schema, rewrite);
            }
        }
    }

    private static void RewriteContent(IDictionary<string, OpenApiMediaType>? content, Func<IOpenApiSchema, IOpenApiSchema> rewrite)
    {
        foreach (var media in content?.Values ?? [])
        {
            if (media.Schema is { } schema)
            {
                media.Schema = Visit(schema, rewrite);
            }
        }
    }

    private static IOpenApiSchema Visit(IOpenApiSchema schema, Func<IOpenApiSchema, IOpenApiSchema> rewrite)
    {
        var rewritten = rewrite(schema);
        if (rewritten is not OpenApiSchema concrete)
        {
            return rewritten;
        }

        if (concrete.Items is { } items)
        {
            concrete.Items = Visit(items, rewrite);
        }

        if (concrete.AdditionalProperties is { } additional)
        {
            concrete.AdditionalProperties = Visit(additional, rewrite);
        }

        if (concrete.Properties is { } properties)
        {
            foreach (var name in properties.Keys.ToList())
            {
                properties[name] = Visit(properties[name], rewrite);
            }
        }

        VisitList(concrete.OneOf, rewrite);
        VisitList(concrete.AnyOf, rewrite);
        VisitList(concrete.AllOf, rewrite);
        return concrete;
    }

    private static void VisitList(IList<IOpenApiSchema>? schemas, Func<IOpenApiSchema, IOpenApiSchema> rewrite)
    {
        for (var index = 0; index < (schemas?.Count ?? 0); index++)
        {
            schemas![index] = Visit(schemas[index], rewrite);
        }
    }
}
