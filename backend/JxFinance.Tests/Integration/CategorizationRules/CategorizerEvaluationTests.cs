using System.Text.RegularExpressions;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.LearnedCategories;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.CategorizationRules;

[Collection<ImportsCollection>]
public sealed class CategorizerEvaluationTests(ImportsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_evaluation_prints_counts_and_never_a_description_or_a_category_name()
    {
        var user = await CreateUserAsync();
        await DemoDataCommand.RunAsync(Services, user.Email);
        using var output = new StringWriter();

        await CategorizerEvaluationCommand.RunAsync(Services, user.Email, output);

        var text = output.ToString();
        Assert.Contains("Recall of the last category", text, StringComparison.Ordinal);
        Assert.Contains("Gate 3", text, StringComparison.Ordinal);
        foreach (var name in await NamesAsync(user.Id))
        {
            Assert.DoesNotMatch(new Regex($@"\b{Regex.Escape(name)}\b", RegexOptions.IgnoreCase), text);
        }
    }

    [Fact]
    public async Task The_evaluation_holds_out_the_last_three_months_and_replays_rules_and_the_recall()
    {
        var user = await CreateUserAsync();
        await DemoDataCommand.RunAsync(Services, user.Email);
        await using var scope = Services.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<JobUser>().User = new FixedUser(user.Id);
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var transport = await db.Categories.SingleAsync(c => c.Name == "Transport", TestContext.Current.CancellationToken);
        db.CategorizationRules.Add(new CategorizationRule
        {
            UserId = user.Id,
            Name = "Fuel",
            Match = DescriptionMatch.StartsWith,
            Pattern = "fuel",
            CategoryId = transport.Id,
        });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        var categorized = db.Transactions.Where(t => t.CategoryId != null);
        var latest = await categorized.MaxAsync(t => t.Date, TestContext.Current.CancellationToken);
        var cutOff = latest.AddMonths(-CategorizerEvaluationCommand.HeldOutMonths);
        var heldOut = await categorized.CountAsync(t => t.Date > cutOff, TestContext.Current.CancellationToken);
        var fuel = await db.Transactions.CountAsync(
            t => t.Date > cutOff && t.Description == "Fuel",
            TestContext.Current.CancellationToken);

        var evaluation = await CategorizerEvaluationCommand.EvaluateAsync(db, TestContext.Current.CancellationToken);

        Assert.Equal(heldOut, evaluation.Cases.Count);
        Assert.True(evaluation.TrainingRows > 0);
        Assert.Equal(new EvaluationScore(heldOut, fuel, fuel), EvaluationScore.Of(evaluation.Cases, c => c.Rule));
        Assert.Equal(new EvaluationScore(heldOut, heldOut, heldOut), EvaluationScore.Of(evaluation.Cases, c => c.Recall));
        Assert.Empty(evaluation.Tail);
        Assert.False(evaluation.HasEnoughHistory);
    }

    [Fact]
    public async Task A_user_without_categorized_rows_gets_an_empty_evaluation()
    {
        var user = await CreateUserAsync();
        await using var scope = Services.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<JobUser>().User = new FixedUser(user.Id);

        var evaluation = await CategorizerEvaluationCommand.EvaluateAsync(
            scope.ServiceProvider.GetRequiredService<AppDbContext>(),
            TestContext.Current.CancellationToken);

        Assert.Same(CategorizerEvaluation.Empty, evaluation);
    }

    private async Task<List<string>> NamesAsync(Guid userId)
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var descriptions = await db.Transactions.IgnoreQueryFilters()
            .Where(t => t.UserId == userId && t.Description != null)
            .Select(t => t.Description!)
            .Distinct()
            .ToListAsync(TestContext.Current.CancellationToken);
        var categories = await db.Categories.IgnoreQueryFilters()
            .Where(c => c.UserId == userId)
            .Select(c => c.Name)
            .ToListAsync(TestContext.Current.CancellationToken);
        return [.. descriptions, .. categories];
    }
}
