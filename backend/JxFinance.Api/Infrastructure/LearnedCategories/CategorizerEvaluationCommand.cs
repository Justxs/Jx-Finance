using System.Diagnostics;
using JxFinance.Common.CategorizationRules;
using JxFinance.Common.LearnedCategories;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.LearnedCategories;

public static class CategorizerEvaluationCommand
{
    public const int HeldOutMonths = 3;
    public const int RecallRows = 200;

    public static async Task RunAsync(IServiceProvider services, string email, TextWriter output)
    {
        var userId = await UserIdAsync(services, email);
        await using var scope = services.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<JobUser>().User = new FixedUser(userId);
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var evaluation = await EvaluateAsync(db, CancellationToken.None);
        CategorizerEvaluationReport.Write(evaluation, output);
    }

    internal static async Task<CategorizerEvaluation> EvaluateAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var categoryTypes = await db.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, c => c.Type, cancellationToken);
        var rows = await RowsAsync(db, categoryTypes, cancellationToken);
        if (rows.Count == 0)
        {
            return CategorizerEvaluation.Empty;
        }

        var cutOff = rows[0].Date.AddMonths(-HeldOutMonths);
        var heldOut = rows.Where(row => row.Date > cutOff).ToList();
        var training = rows.Where(row => row.Date <= cutOff).Take(CategoryModel.MaxTrainingRows).ToList();
        var recallHistory = training.Take(RecallRows).ToList();
        var rules = await db.CategorizationRules.AsNoTracking().OrderBy(r => r.Position).ToListAsync(cancellationToken);

        var (model, trainingTime) = Timed(() => CategoryModel.Train(
            training.Select(row => new TrainingRow(Features(row), row.CategoryId, row.Entry.Type)).ToList()));
        var (guesses, predictionTime) = Timed(() => heldOut.Select(row => model.Predict(Features(row), row.Entry.Type, 0m)).ToList());

        var cases = heldOut
            .Select((row, index) => new EvaluationCase(
                row.CategoryId,
                RuleCategory(rules, categoryTypes, row.Entry),
                Recall(recallHistory, row),
                guesses[index]))
            .ToList();
        var months = (rows[0].Date.Year - rows[^1].Date.Year) * 12 + rows[0].Date.Month - rows[^1].Date.Month + 1;

        return new CategorizerEvaluation(months, training.Count, cases, trainingTime, predictionTime);
    }

    private static (T Result, TimeSpan Elapsed) Timed<T>(Func<T> work)
    {
        work();
        var started = Stopwatch.GetTimestamp();
        var result = work();
        return (result, Stopwatch.GetElapsedTime(started));
    }

    private static IReadOnlyList<string> Features(EvaluationRow row) =>
        CategoryFeatures.Of(row.PayeeKey, row.Entry.AccountId, row.Entry.Amount);

    private static async Task<Guid> UserIdAsync(IServiceProvider services, string email)
    {
        await using var scope = services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await users.FindByEmailAsync(email)
            ?? throw new InvalidOperationException($"No user with the email {email}.");
        return user.Id;
    }

    private static async Task<List<EvaluationRow>> RowsAsync(
        AppDbContext db,
        Dictionary<CategoryId, FlowType> categoryTypes,
        CancellationToken cancellationToken)
    {
        var latest = await db.Transactions
            .Where(t => t.CategoryId != null && !t.IsSplit && t.Amount.Amount > 0)
            .MaxAsync(t => (DateOnly?)t.Date, cancellationToken);
        if (latest is not { } newest)
        {
            return [];
        }

        var from = newest.AddMonths(-HeldOutMonths - CategoryModel.LookBackMonths);
        var rows = await db.Transactions
            .AsNoTracking()
            .Where(t => t.CategoryId != null && !t.IsSplit && t.Amount.Amount > 0 && t.Date > from)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => new { t.Id, t.AccountId, t.Type, t.Amount.Amount, t.Description, t.PayeeKey, CategoryId = t.CategoryId!.Value, t.Date })
            .ToListAsync(cancellationToken);

        return rows
            .Where(t => categoryTypes.TryGetValue(t.CategoryId, out var type) && type == t.Type)
            .Select(t => new EvaluationRow(
                new LedgerEntry(t.Id, t.AccountId, t.Type, t.Amount, t.Description),
                t.PayeeKey ?? string.Empty,
                t.CategoryId,
                t.Date))
            .ToList();
    }

    private static CategoryId? RuleCategory(
        List<CategorizationRule> rules,
        Dictionary<CategoryId, FlowType> categoryTypes,
        LedgerEntry entry) =>
        rules.FirstOrDefault(rule => rule.CategoryId is not { } categoryId
            ? RuleMatcher.Matches(rule, null, entry)
            : categoryTypes.TryGetValue(categoryId, out var type) && RuleMatcher.Matches(rule, type, entry))
            ?.CategoryId;

    private static CategoryId? Recall(List<EvaluationRow> history, EvaluationRow row)
    {
        var description = RecallText(row.Entry.Description);
        return description.Length == 0
            ? null
            : history.Find(earlier => earlier.Entry.Type == row.Entry.Type
                && RecallText(earlier.Entry.Description) == description)?.CategoryId;
    }

    private static string RecallText(string? description) => description?.Trim().ToLowerInvariant() ?? string.Empty;

    private sealed record EvaluationRow(LedgerEntry Entry, string PayeeKey, CategoryId CategoryId, DateOnly Date);
}
