using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Middleware;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;

namespace JxFinance.Tests.Unit;

[Collection<FastEndpointsPipeline>]
public sealed class MiddlewareProblemTests
{
    private const string TraceId = "probe-trace";

    public MiddlewareProblemTests()
    {
        Assert.NotEmpty(FastEndpointsPipeline.Endpoints);
    }

    [Fact]
    public async Task A_disabled_feature_answers_the_problem_an_endpoint_would_send()
    {
        var context = CreateContext(ApiRoutes.BudgetsPath, Feature.Budgets);
        var calledNext = false;
        var middleware = new FeatureGateMiddleware(_ => { calledNext = true; return Task.CompletedTask; }, Settings(Feature.Budgets));

        await middleware.InvokeAsync(context);

        var expected = await EndpointProblemAsync(
            ApiRoutes.BudgetsPath,
            new DomainError(ErrorCodes.FeatureDisabled, "The Budgets feature is turned off for this installation."));
        Assert.False(calledNext);
        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
        Assert.Equal(expected.ContentType, context.Response.ContentType);
        Assert.Equal(expected.Body, BodyOf(context));
        Assert.Equal(ErrorCodes.FeatureDisabled, SingleErrorCode(BodyOf(context)));
    }

    [Fact]
    public async Task An_enabled_feature_or_an_ungated_endpoint_passes_through()
    {
        var enabled = CreateContext(ApiRoutes.BudgetsPath, Feature.Budgets);
        var ungated = CreateContext(ApiRoutes.AccountsPath, feature: null);
        var passed = 0;
        RequestDelegate next = _ => { passed++; return Task.CompletedTask; };

        await new FeatureGateMiddleware(next, Settings()).InvokeAsync(enabled);
        await new FeatureGateMiddleware(next, Settings(Feature.Budgets, Feature.Households)).InvokeAsync(ungated);

        Assert.Equal(2, passed);
    }

    [Fact]
    public async Task The_household_list_answers_empty_while_households_are_off()
    {
        var context = CreateContext(ApiRoutes.HouseholdsPath, Feature.Households);

        await new FeatureGateMiddleware(_ => Task.CompletedTask, Settings(Feature.Households)).InvokeAsync(context);

        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
        Assert.Equal("[]", BodyOf(context));
    }

    [Fact]
    public async Task Conflicting_active_households_answer_the_problem_an_endpoint_would_send()
    {
        var path = ApiRoutes.TransactionsPath + "/export";
        var context = CreateContext(path, feature: null);
        context.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "probe")], "probe"));
        context.Request.Headers[ActiveHousehold.HeaderName] = Guid.NewGuid().ToString();
        context.Request.QueryString = QueryString.Create(ActiveHousehold.QueryName, Guid.NewGuid().ToString());
        var middleware = new ActiveHouseholdMiddleware(_ => Task.CompletedTask, Settings());

        await middleware.InvokeAsync(context, null!, null!);

        var expected = await EndpointProblemAsync(
            path,
            new DomainError(
                ErrorCodes.HouseholdScopeMismatch,
                $"The {ActiveHousehold.HeaderName} header and the {ActiveHousehold.QueryName} query parameter name two different households."));
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
        Assert.Equal(expected.ContentType, context.Response.ContentType);
        Assert.Equal(expected.Body, BodyOf(context));
        Assert.Equal(ErrorCodes.HouseholdScopeMismatch, SingleErrorCode(BodyOf(context)));
    }

    [Fact]
    public async Task An_unhandled_exception_answers_the_same_problem_shape_without_errors()
    {
        var context = CreateContext("/api/accounts", feature: null);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;

        await ProblemResponses.WriteServerErrorAsync(context);

        using var document = JsonDocument.Parse(BodyOf(context));
        var problem = document.RootElement;
        Assert.StartsWith("application/problem+json", context.Response.ContentType, StringComparison.Ordinal);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.Equal(500, problem.GetProperty("status").GetInt32());
        Assert.Equal(ProblemResponses.ServerErrorTitle, problem.GetProperty("title").GetString());
        Assert.Equal("/api/accounts", problem.GetProperty("instance").GetString());
        Assert.Equal(TraceId, problem.GetProperty("traceId").GetString());
        Assert.Empty(problem.GetProperty("errors").EnumerateArray());
    }

    private static DefaultHttpContext CreateContext(string path, Feature? feature)
    {
        var context = new DefaultHttpContext { TraceIdentifier = TraceId };
        context.Request.Method = HttpMethods.Get;
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        var metadata = feature is { } gated ? new EndpointMetadataCollection(new RequiresFeature(gated)) : EndpointMetadataCollection.Empty;
        context.SetEndpoint(new Endpoint(null, metadata, path));
        return context;
    }

    private static async Task<(string? ContentType, string Body)> EndpointProblemAsync(string path, DomainError error)
    {
        var endpoint = Factory.Create<ProbeEndpoint>(context =>
        {
            context.TraceIdentifier = TraceId;
            context.Request.Path = path;
            context.Response.Body = new MemoryStream();
        });
        await endpoint.Sender.ProblemAsync(error, TestContext.Current.CancellationToken);
        return (endpoint.HttpContext.Response.ContentType, BodyOf(endpoint.HttpContext));
    }

    private static string BodyOf(HttpContext context) => Encoding.UTF8.GetString(((MemoryStream)context.Response.Body).ToArray());

    private static string? SingleErrorCode(string body)
    {
        using var document = JsonDocument.Parse(body);
        var error = Assert.Single(document.RootElement.GetProperty("errors").EnumerateArray());
        Assert.Equal(ProblemResponses.GeneralErrorsField, error.GetProperty("name").GetString(), ignoreCase: true);
        return error.GetProperty("code").GetString();
    }

    private static FixedSettings Settings(params Feature[] disabled)
    {
        var features = FeatureFlags.All with
        {
            Budgets = !disabled.Contains(Feature.Budgets),
            Households = !disabled.Contains(Feature.Households),
        };
        return new FixedSettings(new InstanceSettings { Features = features });
    }

    private sealed class FixedSettings(InstanceSettings settings) : IInstanceSettingsStore
    {
        public InstanceSettingsSnapshot Current { get; private set; } = InstanceSettingsSnapshot.From(settings);

        public InstanceSettings Defaults() => settings;

        public void Set(InstanceSettings value) => Current = InstanceSettingsSnapshot.From(value);
    }

    public sealed class ProbeEndpoint : EndpointWithoutRequest
    {
        public ResponseSender<EmptyRequest, object?> Sender => Send;
    }
}
