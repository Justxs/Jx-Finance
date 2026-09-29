using JxFinance.Common.LearnedCategories;
using JxFinance.Domain.Categories;

namespace JxFinance.Infrastructure.LearnedCategories;

public sealed record EvaluationCase(CategoryId Actual, CategoryId? Rule, CategoryId? Recall, LearnedGuess? Guess)
{
    public bool IsTail => Rule is null && Recall is null;

    public CategoryId? Learned(decimal threshold) =>
        Guess is { } guess && guess.Confidence >= threshold ? guess.CategoryId : null;
}

public sealed record EvaluationScore(int Rows, int Filled, int Right)
{
    public double Coverage => Rows == 0 ? 0 : (double)Filled / Rows;

    public double Precision => Filled == 0 ? 0 : (double)Right / Filled;

    public static EvaluationScore Of(IReadOnlyCollection<EvaluationCase> cases, Func<EvaluationCase, CategoryId?> pick)
    {
        var filled = cases.Select(c => (Guess: pick(c), c.Actual)).Where(c => c.Guess is not null).ToList();
        return new EvaluationScore(cases.Count, filled.Count, filled.Count(c => c.Guess == c.Actual));
    }
}

public sealed record CategorizerEvaluation(
    int Months,
    int TrainingRows,
    IReadOnlyList<EvaluationCase> Cases,
    TimeSpan TrainingTime,
    TimeSpan PredictionTime)
{
    public const int GateMonths = 6;
    public const int GateRows = 1500;
    public const double GatePrecision = 0.90;
    public const double GateCoverage = 0.30;

    public static readonly CategorizerEvaluation Empty = new(0, 0, [], TimeSpan.Zero, TimeSpan.Zero);

    public static IReadOnlyList<decimal> Thresholds { get; } = [0.60m, 0.65m, 0.70m, 0.75m, 0.80m, 0.85m, 0.90m, 0.95m];

    public IReadOnlyList<EvaluationCase> Tail => Cases.Where(c => c.IsTail).ToList();

    public IReadOnlyList<EvaluationCase> Recalled => Cases.Where(c => c.Recall is not null).ToList();

    public bool HasEnoughHistory => Months >= GateMonths && TrainingRows + Cases.Count >= GateRows;

    public bool FillsTheTail(decimal threshold)
    {
        var score = EvaluationScore.Of(Tail, c => c.Learned(threshold));
        return score.Precision >= GatePrecision && score.Coverage >= GateCoverage;
    }

    public bool MatchesTheRecall(decimal threshold)
    {
        var learned = EvaluationScore.Of(Recalled, c => c.Learned(threshold));
        return learned.Filled == 0 || learned.Precision >= EvaluationScore.Of(Recalled, c => c.Recall).Precision;
    }
}
