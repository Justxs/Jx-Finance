using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Goals;

[Collection<IntegrationCollection>]
public sealed class GoalEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_update_and_delete_a_goal()
    {
        var createResponse = await Client.PostAsJsonAsync(
            "/api/goals",
            new { name = "Emergency fund", targetAmount = "5000.00", currentAmount = "1000.00" });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var goal = await createResponse.Content.ReadFromJsonAsync<GoalDto>();
        Assert.Equal("5000.00", goal!.TargetAmount);
        Assert.Equal("1000.00", goal.CurrentAmount);

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/goals/{goal.Id}",
            new { name = "Emergency fund", targetAmount = "5000.00", currentAmount = "1500.00" });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<GoalDto>();
        Assert.Equal("1500.00", updated!.CurrentAmount);

        var listed = await Client.GetFromJsonAsync<List<GoalDto>>("/api/goals");
        Assert.Contains(listed!, g => g.Id == goal.Id);

        var deleteResponse = await Client.DeleteAsync($"/api/goals/{goal.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetFromJsonAsync<List<GoalDto>>("/api/goals");
        Assert.DoesNotContain(afterDelete!, g => g.Id == goal.Id);
    }

    private sealed record GoalDto(Guid Id, string TargetAmount, string CurrentAmount);
}
