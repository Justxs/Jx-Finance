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
    public async Task Create_rejects_an_invalid_value_and_names_the_field(string field, string value)
    {
        var body = new Dictionary<string, object> { ["name"] = "Goal", ["targetAmount"] = "100.00", ["currentAmount"] = "0.00" };
        body[field] = value;

        var response = await Client.PostAsJsonAsync("/api/goals", body);

        await AssertValidationErrorAsync(response, field);
    }
}
