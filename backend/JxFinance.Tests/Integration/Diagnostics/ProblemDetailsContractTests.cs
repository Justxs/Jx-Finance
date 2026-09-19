using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using JxFinance.Common.Errors;
using JxFinance.Common.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection<IntegrationCollection>]
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

    [Theory]
    [InlineData("\"12,50\"")]
    [InlineData("\"1,000.00\"")]
    [InlineData("\"NaN\"")]
    [InlineData("\"\"")]
    [InlineData("12.50")]
    [InlineData("null")]
    public async Task Malformed_money_answers_problem_json_naming_the_field(string token)
    {
        var body = $$"""{"name":"Everyday","type":"checking","startingBalance":{{token}},"scope":"personal"}""";

        var response = await Client.PostAsync("/api/accounts", new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await ReadProblemAsync(response);
        var error = Assert.Single(problem.GetProperty("errors").EnumerateArray());
        Assert.Equal("startingBalance", error.GetProperty("name").GetString());
        Assert.Equal(DecimalString.Invalid, error.GetProperty("reason").GetString());
    }

    [Theory]
    [InlineData("0.001")]
    [InlineData("10000000000000000.00")]
    public async Task Money_outside_the_scale_or_range_names_the_field(string value)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Everyday", type = "checking", startingBalance = value, scope = "personal" });

        await AssertValidationErrorAsync(response, "startingBalance");
    }

    [Fact]
    public async Task Money_that_may_be_zero_is_still_refused_when_missing()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Everyday", type = "checking", scope = "personal" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("startingBalance", await response.Content.ReadAsStringAsync());
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
