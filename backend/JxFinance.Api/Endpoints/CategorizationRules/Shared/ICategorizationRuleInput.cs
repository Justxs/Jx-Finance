using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public interface ICategorizationRuleInput
{
    string Name { get; }
    DescriptionMatch Match { get; }
    string Pattern { get; }
    Guid? AccountId { get; }
    decimal? MinAmount { get; }
    decimal? MaxAmount { get; }
    Guid? CategoryId { get; }
    IReadOnlyList<Guid> TagIds { get; }
}
