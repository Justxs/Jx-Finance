using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public static class RuleOrder
{
    public static IOrderedQueryable<CategorizationRule> Ordered(this IQueryable<CategorizationRule> rules) =>
        rules.OrderBy(r => r.Position).ThenBy(r => r.CreatedAt);

    public static void Renumber(this List<CategorizationRule> rules)
    {
        for (var index = 0; index < rules.Count; index++)
        {
            rules[index].Position = index;
        }
    }
}
