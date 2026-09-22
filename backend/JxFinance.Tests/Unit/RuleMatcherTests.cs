using JxFinance.Common.CategorizationRules;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Tests.Unit;

public sealed class RuleMatcherTests
{
    private static readonly AccountId Account = new(Guid.NewGuid());
    private static readonly AccountId OtherAccount = new(Guid.NewGuid());

    [Fact]
    public void A_rule_without_limits_matches_on_the_description_alone()
    {
        Assert.True(RuleMatcher.Matches(Rule(), null, Entry("Maxima LT shopping")));
        Assert.False(RuleMatcher.Matches(Rule(), null, Entry("Rimi shopping")));
    }

    [Fact]
    public void A_rule_bound_to_an_account_skips_every_other_account()
    {
        var rule = Rule();
        rule.AccountId = OtherAccount;

        Assert.False(RuleMatcher.Matches(rule, null, Entry("Maxima")));
    }

    [Fact]
    public void The_category_type_has_to_match_the_entry()
    {
        Assert.False(RuleMatcher.Matches(Rule(), FlowType.Income, Entry("Maxima")));
        Assert.True(RuleMatcher.Matches(Rule(), FlowType.Expense, Entry("Maxima")));
    }

    [Fact]
    public void Amounts_outside_the_range_are_left_out()
    {
        var rule = Rule();
        rule.MinAmount = 10m;
        rule.MaxAmount = 20m;

        Assert.False(RuleMatcher.Matches(rule, null, Entry("Maxima", 9.99m)));
        Assert.True(RuleMatcher.Matches(rule, null, Entry("Maxima", 10m)));
        Assert.True(RuleMatcher.Matches(rule, null, Entry("Maxima", 20m)));
        Assert.False(RuleMatcher.Matches(rule, null, Entry("Maxima", 20.01m)));
    }

    [Fact]
    public void An_entry_without_a_description_never_matches()
    {
        Assert.False(RuleMatcher.Matches(Rule(), null, Entry(null)));
    }

    [Fact]
    public void Matching_the_start_of_a_description_ignores_case()
    {
        var rule = Rule();
        rule.Match = DescriptionMatch.StartsWith;

        Assert.True(RuleMatcher.Matches(rule, null, Entry("MAXIMA LT")));
        Assert.False(RuleMatcher.Matches(rule, null, Entry("Pirkinys Maxima LT")));
    }

    private static CategorizationRule Rule() => new()
    {
        Name = "Groceries",
        Pattern = "maxima",
        Match = DescriptionMatch.Contains,
    };

    private static LedgerEntry Entry(string? description, decimal amount = 15m) =>
        new(TransactionId.New(), Account, FlowType.Expense, amount, description);
}
