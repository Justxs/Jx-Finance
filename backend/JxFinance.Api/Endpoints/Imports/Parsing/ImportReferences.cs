using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace JxFinance.Endpoints.Imports.Parsing;

public static class ImportReferences
{
    public const int MaxLength = 64;

    public static string Hash(string input) => "h:" + Base64Url.EncodeToString(SHA256.HashData(Encoding.UTF8.GetBytes(input)));

    public static void Disambiguate(List<ParsedRow> rows)
    {
        var seen = new Dictionary<string, int>(StringComparer.Ordinal);
        for (var index = 0; index < rows.Count; index++)
        {
            var occurrence = seen.GetValueOrDefault(rows[index].ImportRef);
            seen[rows[index].ImportRef] = occurrence + 1;
            if (occurrence > 0)
            {
                rows[index] = rows[index] with { ImportRef = Hash($"{rows[index].ImportRef}#{occurrence}") };
            }
        }
    }
}
