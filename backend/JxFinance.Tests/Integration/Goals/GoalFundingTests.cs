using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Goals;

[Collection<IntegrationCollection>]
public sealed class GoalFundingTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_manual_goal_keeps_the_typed_amount_as_its_progress()
    {
        using var member = await CreateUserClientAsync();

        var goal = await PostAsync<GoalDto>(
            member,
            "/api/goals",
            new { name = "Emergency fund", targetAmount = "5000.00", currentAmount = "1200.00" });

        Assert.Equal(("manual", "1200.00", "1200.00"), (goal.Funding, goal.CurrentAmount, goal.ProgressAmount));
        Assert.Null(goal.FundingAccountId);
        Assert.Equal(100, goal.FundingSharePercent);
    }

    [Fact]
    public async Task A_funded_goal_follows_the_accounts_reporting_balance_and_its_share()
    {
        using var member = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, accountId, null, "income", "500.00", "2026-06-01");
        await CreateTransactionAsync(member, accountId, null, "expense", "100.00", "2026-06-01");

        var goal = await PostAsync<GoalDto>(
            member,
            "/api/goals",
            new
            {
                name = "House deposit",
                targetAmount = "20000.00",
                currentAmount = "999.00",
                funding = "account",
                fundingAccountId = accountId,
            });

        var halved = await member.PutAsJsonAsync(
            $"/api/goals/{goal.Id}",
            new
            {
                name = "House deposit",
                targetAmount = "20000.00",
                funding = "account",
                fundingAccountId = accountId,
                fundingSharePercent = 50,
            }, TestContext.Current.CancellationToken);
        var shared = await halved.Content.ReadFromJsonAsync<GoalDto>(TestContext.Current.CancellationToken);

        Assert.Equal("1400.00", goal.ProgressAmount);
        Assert.Equal(accountId, goal.FundingAccountId);
        Assert.Equal("0.00", goal.CurrentAmount);
        Assert.Equal("700.00", shared!.ProgressAmount);
        Assert.Equal(50, shared.FundingSharePercent);
    }

    [Fact]
    public async Task A_negative_balance_reads_as_no_progress_rather_than_a_negative_amount()
    {
        using var member = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync("0.00", client: member);
        await CreateTransactionAsync(member, accountId, null, "expense", "250.00", "2026-06-01");

        var goal = await PostAsync<GoalDto>(
            member,
            "/api/goals",
            new { name = "Overdrawn", targetAmount = "1000.00", funding = "account", fundingAccountId = accountId });

        Assert.Equal("0.00", goal.ProgressAmount);
    }

    [Fact]
    public async Task An_archived_funding_account_leaves_the_goal_readable_without_progress()
    {
        using var member = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync("300.00", client: member);
        var manual = await PostAsync<GoalDto>(
            member,
            "/api/goals",
            new { name = "Manual", targetAmount = "100.00", currentAmount = "40.00" });
        var funded = await PostAsync<GoalDto>(
            member,
            "/api/goals",
            new { name = "Funded", targetAmount = "1000.00", funding = "account", fundingAccountId = accountId });

        var archive = await member.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken);
        var listed = await member.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, archive.StatusCode);
        Assert.Equal("300.00", funded.ProgressAmount);
        Assert.Equal(2, listed!.Count);
        Assert.Null(listed.Single(g => g.Id == funded.Id).ProgressAmount);
        Assert.Equal("40.00", listed.Single(g => g.Id == manual.Id).ProgressAmount);
    }

    [Fact]
    public async Task An_account_of_another_user_cannot_fund_a_goal()
    {
        var stranger = await CreateUserAsync();
        using var strangerClient = await LoginAsync(stranger);
        var strangerAccount = await CreateAccountAsync("900.00", client: strangerClient);
        using var member = await CreateUserClientAsync();

        var response = await member.PostAsJsonAsync(
            "/api/goals",
            new { name = "Borrowed", targetAmount = "100.00", funding = "account", fundingAccountId = strangerAccount }, TestContext.Current.CancellationToken);
        var unknown = await member.PostAsJsonAsync(
            "/api/goals",
            new { name = "Ghost", targetAmount = "100.00", funding = "account", fundingAccountId = Guid.NewGuid() }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "reference.notFound");
        await AssertProblemAsync(unknown, HttpStatusCode.BadRequest, "reference.notFound");
        Assert.Empty((await member.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken))!);
    }

    [Fact]
    public async Task Switching_between_the_two_modes_keeps_the_stored_manual_amount()
    {
        using var member = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync("800.00", client: member);
        var goal = await PostAsync<GoalDto>(
            member,
            "/api/goals",
            new { name = "Car", targetAmount = "9000.00", currentAmount = "1750.00" });

        var toAccount = await member.PutAsJsonAsync(
            $"/api/goals/{goal.Id}",
            new { name = "Car", targetAmount = "9000.00", funding = "account", fundingAccountId = accountId }, TestContext.Current.CancellationToken);
        var funded = await toAccount.Content.ReadFromJsonAsync<GoalDto>(TestContext.Current.CancellationToken);

        var backToManual = await member.PutAsJsonAsync(
            $"/api/goals/{goal.Id}",
            new { name = "Car", targetAmount = "9000.00", currentAmount = funded!.CurrentAmount, funding = "manual" }, TestContext.Current.CancellationToken);
        var manual = await backToManual.Content.ReadFromJsonAsync<GoalDto>(TestContext.Current.CancellationToken);

        Assert.Equal(("1750.00", "800.00"), (funded.CurrentAmount, funded.ProgressAmount));
        Assert.Equal(("manual", "1750.00", "1750.00"), (manual!.Funding, manual.CurrentAmount, manual.ProgressAmount));
        Assert.Null(manual.FundingAccountId);
    }

    [Theory]
    [InlineData("fundingAccountId", "account", null, null)]
    [InlineData("fundingAccountId", "manual", "account", null)]
    [InlineData("fundingSharePercent", "account", "account", 0)]
    [InlineData("fundingSharePercent", "account", "account", 101)]
    public async Task Create_rejects_a_funding_choice_that_does_not_hold_together(
        string field,
        string funding,
        string? accountFrom,
        int? sharePercent)
    {
        using var member = await CreateUserClientAsync();
        var accountId = accountFrom is null ? (Guid?)null : await CreateAccountAsync("10.00", client: member);

        var response = await member.PostAsJsonAsync(
            "/api/goals",
            new
            {
                name = "Mixed up",
                targetAmount = "100.00",
                funding,
                fundingAccountId = accountId,
                fundingSharePercent = sharePercent,
            }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, field);
        Assert.Empty((await member.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken))!);
    }

    [Fact]
    public async Task A_long_list_of_funded_goals_reads_every_balance_in_one_pass()
    {
        using var member = await CreateUserClientAsync();
        var first = await CreateAccountAsync("100.00", client: member);
        var second = await CreateAccountAsync("250.00", client: member);

        for (var index = 0; index < 20; index++)
        {
            await PostAsync<GoalDto>(
                member,
                "/api/goals",
                new
                {
                    name = $"Goal {index}",
                    targetAmount = "1000.00",
                    funding = "account",
                    fundingAccountId = index % 2 == 0 ? first : second,
                    fundingSharePercent = 100,
                });
        }

        var listed = await member.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken);

        Assert.Equal(20, listed!.Count);
        Assert.Equal(10, listed.Count(g => g.ProgressAmount == "100.00"));
        Assert.Equal(10, listed.Count(g => g.ProgressAmount == "250.00"));
    }

    private sealed record GoalDto(
        Guid Id,
        string Name,
        string TargetAmount,
        string CurrentAmount,
        DateOnly? TargetDate,
        string Funding,
        Guid? FundingAccountId,
        int FundingSharePercent,
        string? ProgressAmount);
}
