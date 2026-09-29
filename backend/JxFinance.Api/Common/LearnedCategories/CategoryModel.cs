using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Common.LearnedCategories;

public sealed record TrainingRow(IReadOnlyList<string> Tokens, CategoryId CategoryId, FlowType Type);

public sealed record LearnedGuess(CategoryId CategoryId, decimal Confidence, int Support);

public sealed record CategoryPosterior(CategoryId CategoryId, double Probability);

public sealed class CategoryModel
{
    public const decimal MinimumConfidence = 0.80m;
    public const int MinimumSupport = 3;
    public const int LookBackMonths = 24;
    public const int MaxTrainingRows = 10000;

    private readonly Dictionary<CategoryId, CategoryCounts> categories = [];
    private readonly HashSet<string> vocabulary = new(StringComparer.Ordinal);

    private CategoryModel()
    {
    }

    public static CategoryModel Train(IEnumerable<TrainingRow> rows)
    {
        var model = new CategoryModel();
        foreach (var row in rows)
        {
            if (!model.categories.TryGetValue(row.CategoryId, out var counts))
            {
                counts = new CategoryCounts(row.Type);
                model.categories.Add(row.CategoryId, counts);
            }

            counts.Rows++;
            counts.TokenTotal += row.Tokens.Count;
            foreach (var token in row.Tokens)
            {
                counts.Tokens[token] = counts.Tokens.GetValueOrDefault(token) + 1;
                model.vocabulary.Add(token);
            }
        }

        return model;
    }

    public IReadOnlyList<CategoryPosterior> Posteriors(IReadOnlyList<string> tokens, FlowType type)
    {
        var known = tokens.Where(vocabulary.Contains).ToList();
        var scores = categories
            .Where(category => category.Value.Type == type)
            .Select(category => (category.Key, Score: LogScore(category.Value, known)))
            .ToList();
        if (scores.Count == 0)
        {
            return [];
        }

        var best = scores.Max(score => score.Score);
        var total = scores.Sum(score => Math.Exp(score.Score - best));

        return scores
            .Select(score => new CategoryPosterior(score.Key, Math.Exp(score.Score - best) / total))
            .OrderByDescending(posterior => posterior.Probability)
            .ThenBy(posterior => posterior.CategoryId.Value)
            .ToList();
    }

    public LearnedGuess? Predict(
        IReadOnlyList<string> tokens,
        FlowType type,
        decimal minimumConfidence = MinimumConfidence)
    {
        if (Posteriors(tokens, type) is not [var best, ..])
        {
            return null;
        }

        var counts = categories[best.CategoryId];
        var support = tokens
            .Where(CategoryFeatures.IsWord)
            .Select(token => counts.Tokens.GetValueOrDefault(token))
            .DefaultIfEmpty()
            .Max();
        var confidence = (decimal)best.Probability;

        return confidence >= minimumConfidence && support >= MinimumSupport
            ? new LearnedGuess(best.CategoryId, confidence, support)
            : null;
    }

    private double LogScore(CategoryCounts counts, List<string> tokens)
    {
        var denominator = Math.Log(counts.TokenTotal + vocabulary.Count);
        return Math.Log(counts.Rows)
            + tokens.Sum(token => Math.Log(counts.Tokens.GetValueOrDefault(token) + 1) - denominator);
    }

    private sealed class CategoryCounts(FlowType type)
    {
        public FlowType Type { get; } = type;

        public int Rows { get; set; }

        public int TokenTotal { get; set; }

        public Dictionary<string, int> Tokens { get; } = new(StringComparer.Ordinal);
    }
}
