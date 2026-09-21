using FastEndpoints;
using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.CreateCategorizationRule;

public sealed class CreateCategorizationRuleSummary
    : Summary<CreateCategorizationRuleEndpoint, CreateCategorizationRuleRequest>
{
    public CreateCategorizationRuleSummary()
    {
        Summary = "Create a categorization rule";
        Description = "Adds a rule that reads a transaction description and fills in a category, a set "
            + "of tags, or both. The new rule goes last, so it only decides rows no earlier rule "
            + "claimed; move it with the reorder operation. A rule never changes anything on its own: "
            + "it suggests a category in the import preview, and it writes to the ledger only when you "
            + "ask for a run.";
        ExampleRequest = new CreateCategorizationRuleRequest(
            "Groceries",
            DescriptionMatch.Contains,
            "MAXIMA",
            [],
            CategoryId: Guid.Empty);
        RequestParam(r => r.Name, "What the rule is called on the rules screen and in a run's result.");
        RequestParam(r => r.Match, "How the pattern is compared with the description: contains, startsWith or exact. The comparison ignores case.");
        RequestParam(r => r.Pattern, "The text the description is compared with. Per cent and underscore are literal characters, not wildcards.");
        RequestParam(r => r.TagIds, "The tags the rule adds, at most ten; an empty list adds none. A run adds them and never removes tags the row already carries.");
        RequestParam(r => r.AccountId, "Narrows the rule to one account; leave it out to let the rule see every account you can.");
        RequestParam(r => r.MinAmount, "Lowest transaction amount the rule accepts, in the transaction's own currency.");
        RequestParam(r => r.MaxAmount, "Highest transaction amount the rule accepts, in the transaction's own currency.");
        RequestParam(r => r.CategoryId, "The category the rule sets. Its flow type also narrows the rule: an expense category never matches income.");
        Responses[201] = "The rule was created. The Location header points at it.";
        Responses[400] = "Validation failed, the rule sets neither a category nor a tag, a referenced account, category or tag is not visible to you, or you already have 100 rules.";
    }
}
