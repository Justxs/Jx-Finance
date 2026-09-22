using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace JxFinance.Tests.Architecture;

public partial class NotFoundTests
{
    private static readonly string[] AllowedFiles =
    [
        Path.Combine("Common", "EntityLookup.cs"),
        Path.Combine("Common", "Errors", "ErrorCodes.cs"),
    ];

    [Fact]
    public void Not_found_errors_are_built_only_by_the_shared_lookup_helpers()
    {
        var apiDirectory = ApiSourceDirectory();
        var offenders = Directory
            .EnumerateFiles(apiDirectory, "*.cs", SearchOption.AllDirectories)
            .Select(file => Path.GetRelativePath(apiDirectory, file))
            .Where(file => !IsBuildOutput(file) && !AllowedFiles.Contains(file, StringComparer.OrdinalIgnoreCase))
            .Where(file => ResourceNotFound().IsMatch(File.ReadAllText(Path.Combine(apiDirectory, file))))
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.True(
            offenders.Count == 0,
            $"Use EntityLookup (FindOrNotFoundAsync, UpdateOrNotFoundAsync, DeleteOrNotFoundAsync or NotFound) instead of ErrorCodes.ResourceNotFound in: {string.Join(", ", offenders)}");
    }

    private static bool IsBuildOutput(string relativePath)
    {
        var root = relativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)[0];
        return root is "bin" or "obj";
    }

    private static string ApiSourceDirectory([CallerFilePath] string testFile = "")
    {
        var directory = new DirectoryInfo(Path.GetDirectoryName(testFile)!);
        while (!Directory.Exists(Path.Combine(directory.FullName, "JxFinance.Api")))
            directory = directory.Parent ?? throw new InvalidOperationException("JxFinance.Api was not found above the test project.");
        return Path.Combine(directory.FullName, "JxFinance.Api");
    }

    [GeneratedRegex(@"\bResourceNotFound\b")]
    private static partial Regex ResourceNotFound();
}
