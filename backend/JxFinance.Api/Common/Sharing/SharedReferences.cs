using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Tags;

namespace JxFinance.Common.Sharing;

public sealed record SharedReferences(
    IReadOnlyCollection<AccountId> Accounts,
    IReadOnlyCollection<CategoryId> Categories,
    IReadOnlyCollection<TagId> Tags,
    bool HasPersonalOnly = false);
