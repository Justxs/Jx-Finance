namespace JxFinance.Tests.Support;

public static class ApprovedList
{
    public static void AssertMatches(
        IEnumerable<string> approved,
        IEnumerable<string> actual,
        string list,
        Func<string, string> unapproved,
        Func<string, string> stale)
    {
        var expected = approved.ToList();
        var found = actual.ToList();
        var differences = found.Except(expected, StringComparer.Ordinal).Select(unapproved)
            .Concat(expected.Except(found, StringComparer.Ordinal).Select(stale))
            .ToList();

        Assert.True(differences.Count == 0, string.Join(Environment.NewLine, differences));
        Assert.True(
            expected.SequenceEqual(found, StringComparer.Ordinal),
            $"{list} holds the same entries as the code but not one for one: an entry appears twice or the list is out of ordinal order.");
    }
}
