using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Goals;

[Collection<IntegrationCollection>]
public sealed class GoalValidationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Theory]
    [InlineData("name", "")]
    [InlineData("targetAmount", "0.00")]
    [InlineData("targetAmount", "-10.00")]
    [InlineData("targetAmount", "10.005")]
    [InlineData("currentAmount", "abc")]
    [InlineData("currentAmount", "-0.01")]
    public async Task Create_rejects_an_invalid_value_and_names_the_field(string field, string value)
    {
        var body = new Dictionary<string, object> { ["name"] = "Goal", ["targetAmount"] = "100.00", ["currentAmount"] = "0.00" };
        body[field] = value;

        var response = await Client.PostAsJsonAsync("/api/goals", body, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, field);
    }

    [Fact]
    public async Task Update_rejects_a_negative_current_amount_and_keeps_the_goal()
    {
        var goal = await PostAsync<GoalDto>(Client, "/api/goals", new { name = "Goal", targetAmount = "100.00", currentAmount = "40.00" });

        var response = await Client.PutAsJsonAsync(
            $"/api/goals/{goal.Id}",
            new { name = "Goal", targetAmount = "100.00", currentAmount = "-5.00" }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "currentAmount");
        Assert.Contains("money.nonNegative", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        var goals = await Client.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken);
        Assert.Equal("40.00", goals!.Single(g => g.Id == goal.Id).CurrentAmount);
    }

    private sealed record GoalDto(Guid Id, string CurrentAmount);
}
