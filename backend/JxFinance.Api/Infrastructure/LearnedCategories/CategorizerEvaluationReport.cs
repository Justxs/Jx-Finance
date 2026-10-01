using System.Globalization;
using JxFinance.Common.LearnedCategories;

namespace JxFinance.Infrastructure.LearnedCategories;

public static class CategorizerEvaluationReport
{
    public static void Write(CategorizerEvaluation evaluation, TextWriter output)
    {
        var threshold = CategoryModel.MinimumConfidence;
        var cases = evaluation.Cases;
        var tail = evaluation.Tail;
        var recalled = evaluation.Recalled;
        var learned = Text($"Learned at {threshold:0.00}");

        output.WriteLine("Categorizer evaluation: counts and percentages only.");
        output.WriteLine(Text(
            $"Calendar months with categorized, unsplit rows: {evaluation.Months}. Training rows: {evaluation.TrainingRows}. Held out, the last {CategorizerEvaluationCommand.HeldOutMonths} months: {cases.Count}."));
        output.WriteLine();
        output.WriteLine(Text($"{"Held-out rows",-44}{"rows",8}{"filled",8}{"coverage",10}{"precision",11}"));
        output.WriteLine(Line("Rules", EvaluationScore.Of(cases, c => c.Rule)));
        output.WriteLine(Line("Recall of the last category", EvaluationScore.Of(cases, c => c.Recall)));
        output.WriteLine(Line(learned, EvaluationScore.Of(cases, c => c.Learned(threshold))));
        output.WriteLine(Line("Without the model: rule, then recall", EvaluationScore.Of(cases, c => c.Rule ?? c.Recall)));
        output.WriteLine(Line("With the model: rule, learned, recall", EvaluationScore.Of(cases, c => c.Rule ?? c.Learned(threshold) ?? c.Recall)));
        output.WriteLine(Line("Neither rule nor recall: " + learned, EvaluationScore.Of(tail, c => c.Learned(threshold))));
        output.WriteLine(Line("Recall fills: recall", EvaluationScore.Of(recalled, c => c.Recall)));
        output.WriteLine(Line("Recall fills: " + learned, EvaluationScore.Of(recalled, c => c.Learned(threshold))));
        output.WriteLine();
        output.WriteLine(Text($"{"Threshold",-10}{"tail filled",12}{"coverage",10}{"precision",11}{"all filled",12}{"coverage",10}{"precision",11}"));
        foreach (var level in CategorizerEvaluation.Thresholds)
        {
            var onTail = EvaluationScore.Of(tail, c => c.Learned(level));
            var onAll = EvaluationScore.Of(cases, c => c.Learned(level));
            output.WriteLine(Text(
                $"{level,-10:0.00}{onTail.Filled,12}{Percent(onTail.Coverage),10}{Precision(onTail),11}{onAll.Filled,12}{Percent(onAll.Coverage),10}{Precision(onAll),11}"));
        }

        output.WriteLine();
        output.WriteLine(Text(
            $"Training: {evaluation.TrainingTime.TotalMilliseconds:0.0} ms for {evaluation.TrainingRows} rows. Prediction: {evaluation.PredictionTime.TotalMilliseconds:0.0} ms for {cases.Count} rows."));
        output.WriteLine(Text(
            $"Gate 1, at least {CategorizerEvaluation.GateMonths} months and {CategorizerEvaluation.GateRows} rows: {Verdict(evaluation.HasEnoughHistory)}"));
        output.WriteLine(Text(
            $"Gate 2, {Percent(CategorizerEvaluation.GatePrecision)} precision and {Percent(CategorizerEvaluation.GateCoverage)} coverage where neither rule nor recall fills, at {threshold:0.00}: {Verdict(evaluation.FillsTheTail(threshold))}"));
        output.WriteLine(Text(
            $"Gate 3, learned at least as precise as the recall where the recall fills, at {threshold:0.00}: {Verdict(evaluation.MatchesTheRecall(threshold))}"));
    }

    private static string Line(string label, EvaluationScore score) =>
        Text($"{label,-44}{score.Rows,8}{score.Filled,8}{Percent(score.Coverage),10}{Precision(score),11}");

    private static string Percent(double share) => Text($"{share:0.0%}");

    private static string Precision(EvaluationScore score) => score.Filled == 0 ? "-" : Percent(score.Precision);

    private static string Verdict(bool passed) => passed ? "pass" : "fail";

    private static string Text(IFormattable text) => text.ToString(null, CultureInfo.InvariantCulture);
}
