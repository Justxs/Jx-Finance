using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.LearnedCategories;

[RegisterService<ILearnedCategoryService>(LifeTime.Scoped)]
public sealed class LearnedCategoryService(
    AppDbContext db,
    IInstanceSettingsStore settings,
    IClock clock) : ILearnedCategoryService
{
    public async Task<IReadOnlyList<LearnedGuess?>> SuggestAsync(
        IReadOnlyList<LearnedCandidate> candidates,
        CancellationToken cancellationToken)
    {
        var guesses = new LearnedGuess?[candidates.Count];
        var keys = candidates.Select(candidate => SubscriptionDescription.KeyOf(candidate.Payee, candidate.Description)).ToList();
        var guessable = Enumerable.Range(0, candidates.Count)
            .Where(index => candidates[index].Amount > 0 && keys[index].Length > 0)
            .ToList();
        if (!settings.Current.IsEnabled(Feature.LearnedCategories) || guessable.Count == 0)
        {
            return guesses;
        }

        var model = await TrainAsync(cancellationToken);
        foreach (var index in guessable)
        {
            var candidate = candidates[index];
            guesses[index] = model.Predict(
                CategoryFeatures.Of(keys[index], candidate.AccountId, candidate.Amount),
                candidate.Type);
        }

        return guesses;
    }

    private async Task<CategoryModel> TrainAsync(CancellationToken cancellationToken)
    {
        var from = clock.Today.AddMonths(-CategoryModel.LookBackMonths);
        var rows = await db.Transactions
            .AsNoTracking()
            .Where(t => t.CategoryId != null && !t.IsSplit && t.Amount.Amount > 0 && t.Date >= from)
            .Where(t => db.Categories.Any(c => c.Id == t.CategoryId && c.Type == t.Type))
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Take(CategoryModel.MaxTrainingRows)
            .Select(t => new { t.AccountId, t.Type, t.Amount.Amount, t.PayeeKey, CategoryId = t.CategoryId!.Value })
            .ToListAsync(cancellationToken);

        return CategoryModel.Train(rows.Select(row => new TrainingRow(
            CategoryFeatures.Of(row.PayeeKey ?? string.Empty, row.AccountId, row.Amount),
            row.CategoryId,
            row.Type)));
    }
}
