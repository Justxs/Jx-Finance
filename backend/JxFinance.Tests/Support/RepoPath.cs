using System.Runtime.CompilerServices;

namespace JxFinance.Tests.Support;

public static class RepoPath
{
    public static string Of(string relativePath) => Find(relativePath);

    private static string Find(string relativePath, [CallerFilePath] string supportFile = "")
    {
        for (var directory = new DirectoryInfo(Path.GetDirectoryName(supportFile)!); directory is not null; directory = directory.Parent)
        {
            var path = Path.Combine(directory.FullName, relativePath);
            if (Path.Exists(path))
            {
                return path;
            }
        }

        throw new InvalidOperationException($"{relativePath} was not found above the test project.");
    }
}
