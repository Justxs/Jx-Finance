using JxFinance.Common.OpenApi;
using Microsoft.OpenApi;

namespace JxFinance.Tests.Unit;

public sealed class OpenApiArrayPropertyTests
{
    private const string Plain = "IReadOnlyListOfGuid";
    private const string Bounded = "IReadOnlyListOfGuid__op72C35A0BFBCD";
    private const string Described = "IReadOnlyListOfGuid__op801B7E841F34";

    [Fact]
    public void Collection_properties_of_one_type_keep_their_own_description_and_constraints()
    {
        var document = new OpenApiDocument
        {
            Paths = [],
            Components = new OpenApiComponents { Schemas = new Dictionary<string, IOpenApiSchema>(StringComparer.Ordinal) },
        };
        var schemas = document.Components.Schemas;
        schemas[Plain] = Ids();
        schemas[Bounded] = Ids("Between 1 and 200 transaction ids.", minItems: 1);
        schemas[Described] = Ids("The accounts an import fixed.");
        schemas["Request"] = new OpenApiSchema
        {
            Type = JsonSchemaType.Object,
            Properties = new Dictionary<string, IOpenApiSchema>(StringComparer.Ordinal)
            {
                ["transactionIds"] = new OpenApiSchemaReference(Bounded, document),
                ["accountIds"] = new OpenApiSchemaReference(Described, document),
                ["plainIds"] = new OpenApiSchemaReference(Plain, document),
            },
        };

        SchemaVariants.Collapse(document);
        ArrayWrappers.Inline(document);

        Assert.Equal(["Request"], schemas.Keys);
        var properties = schemas["Request"].Properties!;
        Assert.Equal(("Between 1 and 200 transaction ids.", 1), (properties["transactionIds"].Description, properties["transactionIds"].MinItems));
        Assert.Equal(("The accounts an import fixed.", null), (properties["accountIds"].Description, properties["accountIds"].MinItems));
        Assert.Equal((null, null), (properties["plainIds"].Description, properties["plainIds"].MinItems));
        Assert.All(properties.Values, property => Assert.Equal(JsonSchemaType.String, property.Items!.Type));
    }

    private static OpenApiSchema Ids(string? description = null, int? minItems = null) => new()
    {
        Type = JsonSchemaType.Array,
        Items = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uuid" },
        Description = description,
        MinItems = minItems,
    };
}
