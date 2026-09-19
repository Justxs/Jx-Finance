using Microsoft.OpenApi;

namespace JxFinance.Common.OpenApi;

public static class OperationNames
{
    private const string Suffix = "Endpoint";

    public static void Shorten(OpenApiDocument document)
    {
        var operations = document.Paths.Values
            .Where(path => path.Operations is not null)
            .SelectMany(path => path.Operations!.Values);

        foreach (var operation in operations)
        {
            if (operation.OperationId is { } id && id.Length > Suffix.Length && id.EndsWith(Suffix, StringComparison.Ordinal))
            {
                operation.OperationId = id[..^Suffix.Length];
            }
        }
    }
}
