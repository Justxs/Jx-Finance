using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Tags;
using JxFinance.Endpoints.CategorizationRules.CreateCategorizationRule;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.Mappers;

[RegisterService<CategorizationRuleMapper>(LifeTime.Singleton)]
public sealed class CategorizationRuleMapper
    : Mapper<CreateCategorizationRuleRequest, CategorizationRuleResponse, CategorizationRule>
{
    public override CategorizationRule ToEntity(CreateCategorizationRuleRequest request)
    {
        var rule = new CategorizationRule { Name = request.Name, Pattern = request.Pattern };
        Apply(request, rule);
        return rule;
    }

    public void Apply(ICategorizationRuleInput input, CategorizationRule rule)
    {
        rule.Name = OptionalText.Normalize(input.Name) ?? input.Name;
        rule.Match = input.Match;
        rule.Pattern = OptionalText.Normalize(input.Pattern) ?? input.Pattern;
        rule.AccountId = input.AccountId is { } accountId ? new AccountId(accountId) : null;
        rule.MinAmount = input.MinAmount;
        rule.MaxAmount = input.MaxAmount;
        rule.CategoryId = input.CategoryId is { } categoryId ? new CategoryId(categoryId) : null;
    }

    public List<CategorizationRuleTag> ToTags(CategorizationRuleId ruleId, IReadOnlyList<Guid>? tagIds) =>
        (tagIds ?? [])
            .Distinct()
            .Select(tagId => new CategorizationRuleTag { RuleId = ruleId, TagId = new TagId(tagId) })
            .ToList();

    public CategorizationRuleResponse FromEntity(CategorizationRuleWithTags item) => new(
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
