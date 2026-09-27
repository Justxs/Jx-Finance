using System.Text.RegularExpressions;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Architecture;

public partial class NotificationPublisherTests
{
    private static readonly string PublisherFile = Path.Combine("Common", "Notifications", "NotificationPublisher.cs");

    [Fact]
    public void Only_the_publisher_adds_notifications()
    {
        var apiDirectory = RepoPath.Of("JxFinance.Api");
        var files = Directory
            .EnumerateFiles(apiDirectory, "*.cs", SearchOption.AllDirectories)
            .Select(file => Path.GetRelativePath(apiDirectory, file))
            .Where(file => !IsBuildOutput(file))
            .ToList();
        var offenders = files
            .Where(file => !string.Equals(file, PublisherFile, StringComparison.OrdinalIgnoreCase))
            .Where(file => AddsNotification().IsMatch(File.ReadAllText(Path.Combine(apiDirectory, file))))
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.Contains(PublisherFile, files, StringComparer.OrdinalIgnoreCase);
        Assert.True(
            offenders.Count == 0,
            $"Raise notifications through INotificationPublisher.Publish, not Notifications.Add, in: {string.Join(", ", offenders)}");
    }

    private static bool IsBuildOutput(string relativePath)
    {
        var root = relativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)[0];
        return root is "bin" or "obj";
    }

    [GeneratedRegex(@"\bNotifications\s*\.\s*(Add|AddRange)\s*\(|\bSet<Notification>\s*\(\s*\)\s*\.\s*Add|\bAdd(Range)?\s*\(\s*new\s+Notification\b")]
    private static partial Regex AddsNotification();
}
