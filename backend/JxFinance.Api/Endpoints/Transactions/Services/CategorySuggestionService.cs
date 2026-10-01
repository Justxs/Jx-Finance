using FastEndpoints;
using JxFinance.Common.LearnedCategories;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Transactions.GetUncategorizedSuggestions;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.SuggestCategory;

namespace JxFinance.Endpoints.Transactions.Services;

[RegisterService<ICategorySuggestionService>(LifeTime.Scoped)]
public sealed class CategorySuggestionService(
    ICategorizationRuleService rules,
    ILearnedCategoryService learned,
    ITransactionService transactions,
    IReferenceGuard references,
    IInstanceSettingsStore settings) : ICategorySuggestionService
{
    public async Task<Result<CategorySuggestionResponse>> SuggestAsync(
        SuggestCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.AccountId);
        if (await references.AccountExistsAsync(accountId, cancellationToken) is { } accountError)
        {
            return accountError;
        }

        var ruleSuggestions = await RuleSuggestionsAsync(
            accountId,
            [new RuleCandidate(request.Description, request.Amount, request.Type)],
            cancellationToken);
        if (ruleSuggestions[0] is { CategoryId: { } ruleCategoryId } rule)
        {
            return new CategorySuggestionResponse(ruleCategoryId, CategorySuggestionSource.Rule, rule.RuleName, null);
        }

        var guesses = await learned.SuggestAsync(
            [new LearnedCandidate(accountId, request.Type, request.Amount, request.Description)],
            cancellationToken);

        return guesses[0] is { } guess
            ? new CategorySuggestionResponse(guess.CategoryId.Value, CategorySuggestionSource.Learned, null, guess.Confidence)
            : CategorySuggestionResponse.None;
    }

    public async Task<IReadOnlyList<UncategorizedSuggestionResponse>> SuggestUncategorizedAsync(
        GetUncategorizedSuggestionsRequest request,
        CancellationToken cancellationToken)
    {
        var rows = await transactions.ListUncategorizedAsync(request, BulkRules.MaxTransactions, cancellationToken);
        var answers = new UncategorizedSuggestionResponse?[rows.Count];

        foreach (var account in rows.Select((row, index) => (Row: row, Index: index)).GroupBy(entry => entry.Row.AccountId))
        {
            var entries = account.ToList();
            var suggestions = await RuleSuggestionsAsync(
                new AccountId(account.Key),
                entries.Select(entry => new RuleCandidate(entry.Row.Description, entry.Row.Amount, entry.Row.Type)).ToList(),
                cancellationToken);
            for (var position = 0; position < entries.Count; position++)
            {
                if (suggestions[position] is { CategoryId: { } categoryId } rule)
                {
                    var (row, index) = entries[position];
                    answers[index] = new UncategorizedSuggestionResponse(row, categoryId, CategorySuggestionSource.Rule, rule.RuleName, null);
                }
            }
        }

        var open = Enumerable.Range(0, rows.Count).Where(index => answers[index] is null).ToList();
        var guesses = await learned.SuggestAsync(
            open.Select(index => new LearnedCandidate(new AccountId(rows[index].AccountId), rows[index].Type, rows[index].Amount, rows[index].Description)).ToList(),
            cancellationToken);
        for (var position = 0; position < open.Count; position++)
        {
            if (guesses[position] is { } guess)
            {
                var index = open[position];
                answers[index] = new UncategorizedSuggestionResponse(
                    rows[index],
                    guess.CategoryId.Value,
                    CategorySuggestionSource.Learned,
                    null,
                    guess.Confidence);
            }
        }

        return answers.OfType<UncategorizedSuggestionResponse>().ToList();
    }

    private async Task<IReadOnlyList<RuleSuggestion?>> RuleSuggestionsAsync(
        AccountId accountId,
        IReadOnlyList<RuleCandidate> candidates,
        CancellationToken cancellationToken) =>
        settings.Current.IsEnabled(Feature.CategorizationRules)
            ? await rules.SuggestAsync(accountId, candidates, cancellationToken)
            : candidates.Select(_ => (RuleSuggestion?)null).ToList();
}
