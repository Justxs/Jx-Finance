using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Goals;

[Collection<IntegrationCollection>]
public sealed class GoalIsolationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_goal_cannot_be_read_changed_or_deleted_by_another_user_even_in_the_same_household()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        await CreateHouseholdAsync(owner, partner);
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        var goal = await PostAsync<GoalDto>(ownerClient, "/api/goals", new { name = "Private goal", targetAmount = "500.00", currentAmount = "50.00" });

        var listed = await partnerClient.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken);
        var update = await partnerClient.PutAsJsonAsync($"/api/goals/{goal.Id}", new { name = "Taken over", targetAmount = "1.00", currentAmount = "1.00" }, TestContext.Current.CancellationToken);
        var delete = await partnerClient.DeleteAsync($"/api/goals/{goal.Id}", TestContext.Current.CancellationToken);
        var administratorList = await Client.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken);

        Assert.Empty(listed!);
        Assert.Equal(HttpStatusCode.NotFound, update.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
        Assert.DoesNotContain(administratorList!, g => g.Id == goal.Id);
        Assert.Equal(goal, Assert.Single((await ownerClient.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken))!));
    }

    [Fact]
    public async Task Current_amount_defaults_to_zero_and_may_exceed_the_target()
    {
        using var member = await CreateUserClientAsync();

        var goal = await PostAsync<GoalDto>(member, "/api/goals", new { name = "Holiday", targetAmount = "100.00", targetDate = "2027-01-31" });
        var update = await member.PutAsJsonAsync(
            $"/api/goals/{goal.Id}",
            new { name = "Overfunded", targetAmount = "100.00", currentAmount = "150.00" }, TestContext.Current.CancellationToken);

        Assert.Equal("0.00", goal.CurrentAmount);
        Assert.Equal(new DateOnly(2027, 1, 31), goal.TargetDate);
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await update.Content.ReadFromJsonAsync<GoalDto>(TestContext.Current.CancellationToken);
        Assert.Equal(("Overfunded", "150.00", null), (updated!.Name, updated.CurrentAmount, updated.TargetDate));
    }

    [Theory]
    [InlineData("name", null)]
    [InlineData("name", "   ")]
    [InlineData("name", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")]
    [InlineData("targetAmount", "0.00")]
    [InlineData("targetAmount", "10000000000000000.00")]
    [InlineData("targetAmount", "1,50")]
    [InlineData("currentAmount", "0.001")]
    [InlineData("currentAmount", "10000000000000000.00")]
    public async Task Update_rejects_an_invalid_value_names_the_field_and_changes_nothing(string field, string? value)
    {
        using var member = await CreateUserClientAsync();
        var goal = await PostAsync<GoalDto>(member, "/api/goals", new { name = "Steady", targetAmount = "100.00", currentAmount = "10.00" });
        var body = new Dictionary<string, object?> { ["name"] = "Changed", ["targetAmount"] = "200.00", ["currentAmount"] = "20.00" };
        body[field] = value;

        var response = await member.PutAsJsonAsync($"/api/goals/{goal.Id}", body, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, field);
        Assert.Equal(goal, Assert.Single((await member.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken))!));
    }

    [Fact]
    public async Task The_largest_representable_target_is_accepted()
    {
        using var member = await CreateUserClientAsync();

        var goal = await PostAsync<GoalDto>(member, "/api/goals", new { name = "Moonshot", targetAmount = "9999999999999999.99" });

        Assert.Equal("9999999999999999.99", goal.TargetAmount);
    }

    private sealed record GoalDto(Guid Id, string Name, string TargetAmount, string CurrentAmount, DateOnly? TargetDate);
}
