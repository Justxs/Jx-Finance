using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Tags;
using JxFinance.Endpoints.CategorizationRules.CreateCategorizationRule;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.Mappers;

public static class CategorizationRuleMapper
{
    public static CategorizationRule ToEntity(this CreateCategorizationRuleRequest request)
    {
        var rule = new CategorizationRule { Name = request.Name, Pattern = request.Pattern };
        request.ApplyTo(rule);
        return rule;
    }

    public static void ApplyTo(this ICategorizationRuleInput input, CategorizationRule rule)
    {
        rule.Name = OptionalText.Normalize(input.Name) ?? input.Name;
        rule.Match = input.Match;
        rule.Pattern = OptionalText.Normalize(input.Pattern) ?? input.Pattern;
        rule.AccountId = input.AccountId is { } accountId ? new AccountId(accountId) : null;
        rule.MinAmount = input.MinAmount;
        rule.MaxAmount = input.MaxAmount;
        rule.CategoryId = input.CategoryId is { } categoryId ? new CategoryId(categoryId) : null;
    }

    public static List<CategorizationRuleTag> ToRuleTags(this IReadOnlyList<Guid>? tagIds, CategorizationRuleId ruleId) =>
        (tagIds ?? [])
            .Distinct()
            .Select(tagId => new CategorizationRuleTag { RuleId = ruleId, TagId = new TagId(tagId) })
            .ToList();

    public static CategorizationRuleResponse ToResponse(this CategorizationRuleWithTags item) => new(
        item.Rule.Id.Value,
        item.Rule.Name,
        item.Rule.Position,
        item.Rule.Match,
        item.Rule.Pattern,
        item.Rule.AccountId?.Value,
        item.Rule.MinAmount,
        item.Rule.MaxAmount,
        item.Rule.CategoryId?.Value,
        item.TagIds);
}
