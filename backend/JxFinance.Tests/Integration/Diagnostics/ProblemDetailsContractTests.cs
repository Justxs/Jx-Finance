using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Common.Errors;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection(IntegrationCollection.Name)]
public sealed class ProblemDetailsContractTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Validation_failures_answer_problem_json_with_the_offending_field()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "", type = "checking", startingBalance = "0.00", scope = "personal" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await ReadProblemAsync(response);
        Assert.Equal(400, problem.GetProperty("status").GetInt32());
        Assert.Equal("/api/accounts", problem.GetProperty("instance").GetString());

        var errors = problem.GetProperty("errors").EnumerateArray().ToList();
        Assert.Contains(errors, error => error.GetProperty("name").GetString() == "name");
    }

    [Fact]
    public async Task Service_failures_answer_problem_json_carrying_the_error_code()
    {
        var response = await Client.GetAsync($"/api/accounts/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await ReadProblemAsync(response);
        Assert.Equal(404, problem.GetProperty("status").GetInt32());

        var codes = problem.GetProperty("errors")
            .EnumerateArray()
            .Select(error => error.GetProperty("code").GetString())
            .ToList();
        Assert.Contains(ErrorCodes.NotFound, codes);
    }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
