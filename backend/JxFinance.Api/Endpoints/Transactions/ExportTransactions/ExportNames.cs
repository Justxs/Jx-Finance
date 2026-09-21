namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed record ExportNames(
    Dictionary<Guid, string> Accounts,
    Dictionary<Guid, string> Categories,
    Dictionary<Guid, string> Tags)
{
    public const string TagSeparator = "; ";

    public string TagLabel(IReadOnlyList<Guid> tagIds) =>
        string.Join(
            TagSeparator,
            tagIds.Select(id => Tags.GetValueOrDefault(id)).OfType<string>().Order(StringComparer.Ordinal));
}
