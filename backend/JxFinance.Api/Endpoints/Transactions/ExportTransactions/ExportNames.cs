using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Tags.Interfaces;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed record ExportNames(
    Dictionary<Guid, string> Accounts,
    Dictionary<Guid, string> Categories,
    Dictionary<Guid, string> Tags)
{
    public const string TagSeparator = "; ";

    public static async Task<ExportNames> LoadAsync(
        IAccountService accountService,
        ICategoryService categoryService,
        ITagService tagService,
        CancellationToken ct)
    {
        var accounts = await accountService.GetAllAsync(ct);
        var categories = await categoryService.GetAllAsync(ct);
        var tags = await tagService.GetAllAsync(ct);

        return new ExportNames(
            accounts.ToDictionary(a => a.Id, a => a.Name),
            categories.ToDictionary(c => c.Id, c => c.Name),
            tags.ToDictionary(t => t.Id, t => t.Name));
    }

    public string TagLabel(IReadOnlyList<Guid> tagIds) =>
        string.Join(
            TagSeparator,
            tagIds.Select(id => Tags.GetValueOrDefault(id)).OfType<string>().Order(StringComparer.Ordinal));
}
