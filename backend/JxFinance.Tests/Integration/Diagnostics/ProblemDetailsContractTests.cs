using System.Globalization;
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
            new { name = "", type = "checking", startingBalance = "0.00", scope = "personal" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await ReadProblemAsync(response);
        Assert.Equal(400, problem.GetProperty("status").GetInt32());
        Assert.Equal("/api/accounts", problem.GetProperty("instance").GetString());
        Assert.False(string.IsNullOrEmpty(problem.GetProperty("traceId").GetString()));

        var errors = problem.GetProperty("errors").EnumerateArray().ToList();
        var error = Assert.Single(errors, error => error.GetProperty("name").GetString() == "name");
        Assert.Equal(ErrorCodes.Required, error.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("\"12,50\"")]
    [InlineData("\"1,000.00\"")]
    [InlineData("\"NaN\"")]
    [InlineData("\"\"")]
    [InlineData("12.50")]
    public async Task Malformed_money_answers_problem_json_naming_the_field(string token)
    {
        var body = $$"""{"name":"Everyday","type":"checking","startingBalance":{{token}},"scope":"personal"}""";

        var response = await Client.PostAsync("/api/accounts", new StringContent(body, Encoding.UTF8, "application/json"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await ReadProblemAsync(response);
        var error = Assert.Single(problem.GetProperty("errors").EnumerateArray());
        Assert.Equal("startingBalance", error.GetProperty("name").GetString());
        Assert.Equal(DecimalString.Invalid, error.GetProperty("reason").GetString());
        Assert.Equal(ErrorCodes.DecimalMalformed, error.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Unreadable_json_answers_the_generic_malformed_code()
    {
        var response = await Client.PostAsync("/api/accounts", new StringContent("{\"name\":", Encoding.UTF8, "application/json"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        var error = Assert.Single(problem.GetProperty("errors").EnumerateArray());
        Assert.Equal(ErrorCodes.RequestMalformed, error.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("0.001")]
    [InlineData("10000000000000000.00")]
    public async Task Money_outside_the_scale_or_range_names_the_field(string value)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Everyday", type = "checking", startingBalance = value, scope = "personal" }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "startingBalance");
    }

    [Theory]
    [InlineData("""{"name":"Everyday","type":"checking","scope":"personal"}""")]
    [InlineData("""{"name":"Everyday","type":"checking","startingBalance":null,"scope":"personal"}""")]
    public async Task Money_that_may_be_zero_is_still_refused_when_missing(string body)
    {
        var response = await Client.PostAsync("/api/accounts", new StringContent(body, Encoding.UTF8, "application/json"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await ReadProblemAsync(response);
        var error = Assert.Single(problem.GetProperty("errors").EnumerateArray());
        Assert.Equal("startingBalance", error.GetProperty("name").GetString());
        Assert.Equal(ErrorCodes.Required, error.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("/api/goals/{0}", "currentAmount", """{"name":"Trip","targetAmount":"100.00"}""")]
    [InlineData("/api/assets/{0}", "currentValue", """{"name":"Flat","type":"property","asOf":"2026-01-01"}""")]
    [InlineData("/api/debts/{0}", "outstandingAmount", """{"name":"Loan","type":"mortgage","asOf":"2026-01-01"}""")]
    public async Task Updates_name_the_missing_money_field(string route, string field, string body)
    {
        var response = await Client.PutAsync(
            string.Format(CultureInfo.InvariantCulture, route, Guid.NewGuid()),
            new StringContent(body, Encoding.UTF8, "application/json"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        var error = Assert.Single(
            problem.GetProperty("errors").EnumerateArray(),
            error => error.GetProperty("name").GetString() == field);
        Assert.Equal(ErrorCodes.Required, error.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Service_failures_answer_problem_json_carrying_the_error_code()
    {
        var response = await Client.GetAsync($"/api/accounts/{Guid.NewGuid()}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await ReadProblemAsync(response);
        Assert.Equal(404, problem.GetProperty("status").GetInt32());

        var codes = problem.GetProperty("errors")
            .EnumerateArray()
            .Select(error => error.GetProperty("code").GetString())
            .ToList();
        Assert.Contains(ErrorCodes.ResourceNotFound, codes);
    }

    [Fact]
    public async Task Domain_failures_in_the_body_answer_a_specific_code()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = Guid.NewGuid(), type = "expense", amount = "10.00", date = "2026-01-15" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        var error = Assert.Single(problem.GetProperty("errors").EnumerateArray());
        Assert.Equal(ErrorCodes.ReferenceNotFound, error.GetProperty("code").GetString());
    }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
