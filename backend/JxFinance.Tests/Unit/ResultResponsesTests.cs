using System.Text;
using FastEndpoints;
using FluentValidation;
using FluentValidation.Results;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using Microsoft.AspNetCore.Http;

namespace JxFinance.Tests.Unit;

public sealed class ResultResponsesTests
{
    private const string Location = "/api/probes/42";
    private static readonly ProbeResponse Body = new(42, "probe");

    [Theory]
    [InlineData(ErrorCodes.ResourceNotFound)]
    [InlineData(ErrorCodes.ConflictDuplicate)]
    [InlineData(ErrorCodes.AccessForbidden)]
    [InlineData(ErrorCodes.CredentialsInvalid)]
    [InlineData(ErrorCodes.CredentialsLockedOut)]
    [InlineData(ErrorCodes.RequestInvalid)]
    public async Task A_problem_matches_the_response_of_a_thrown_error(string code)
    {
        var error = new DomainError(code, "The probe failed.");

        var thrown = await ThrownAsync(error);
        var sent = await SendAsync(endpoint => endpoint.Sender.ProblemAsync(error, Token));

        Assert.Equal(ErrorCodes.StatusCodeFor(code), sent.Status);
        Assert.Equal(thrown.Status, sent.Status);
        Assert.Equal(thrown.ContentType, sent.ContentType);
        Assert.Equal(thrown.Body, sent.Body);
        Assert.Equal(Describe(thrown.Failures), Describe(sent.Failures));
    }

    [Fact]
    public async Task A_problem_can_override_the_status()
    {
        var error = new DomainError(ErrorCodes.TwoFactorInvalidCode, "The code is wrong.");

        var sent = await SendAsync(endpoint => endpoint.Sender.ProblemAsync(error, StatusCodes.Status401Unauthorized, Token));

        Assert.Equal(StatusCodes.Status401Unauthorized, sent.Status);
        Assert.Equal(ErrorCodes.TwoFactorInvalidCode, Assert.Single(sent.Failures).ErrorCode);
    }

    [Fact]
    public async Task A_successful_result_is_sent_as_ok()
    {
        var sent = await SendAsync(endpoint => endpoint.Sender.OkOrProblemAsync(Body, Token));
        var ok = await SendAsync(endpoint => endpoint.Sender.OkAsync(Body, Token));

        Assert.Equal(StatusCodes.Status200OK, sent.Status);
        Assert.Equal(ok.Body, sent.Body);
        Assert.Empty(sent.Failures);
    }

    [Fact]
    public async Task A_failed_result_is_sent_as_a_problem()
    {
        Result<ProbeResponse> result = new DomainError(ErrorCodes.ResourceNotFound, "Missing.");

        var sent = await SendAsync(endpoint => endpoint.Sender.OkOrProblemAsync(result, Token));

        Assert.Equal(StatusCodes.Status404NotFound, sent.Status);
        Assert.Equal(ErrorCodes.ResourceNotFound, Assert.Single(sent.Failures).ErrorCode);
    }

    [Fact]
    public async Task A_successful_result_without_a_body_is_sent_as_no_content()
    {
        var plain = await SendAsync(endpoint => endpoint.Sender.NoContentOrProblemAsync(Result.Success(), Token));
        var valued = await SendAsync(endpoint => endpoint.Sender.NoContentOrProblemAsync(Result<Guid>.Success(Guid.NewGuid()), Token));

        Assert.Equal(StatusCodes.Status204NoContent, plain.Status);
        Assert.Equal(StatusCodes.Status204NoContent, valued.Status);
        Assert.Empty(plain.Body);
        Assert.Empty(valued.Body);
    }

    [Fact]
    public async Task A_failed_result_without_a_body_is_sent_as_a_problem()
    {
        var sent = await SendAsync(endpoint => endpoint.Sender.NoContentOrProblemAsync(Result.Failure(ErrorCodes.AccessForbidden, "No."), Token));

        Assert.Equal(StatusCodes.Status403Forbidden, sent.Status);
        Assert.Equal(ErrorCodes.AccessForbidden, Assert.Single(sent.Failures).ErrorCode);
    }

    [Fact]
    public async Task A_created_result_answers_201_with_the_location_and_the_body()
    {
        var sent = await SendAsync(endpoint => endpoint.Sender.CreatedOrProblemAsync(Body, probe => $"/api/probes/{probe.Id}", Token));
        var ok = await SendAsync(endpoint => endpoint.Sender.OkAsync(Body, Token));

        Assert.Equal(StatusCodes.Status201Created, sent.Status);
        Assert.Equal(Location, sent.Location);
        Assert.Equal(ok.ContentType, sent.ContentType);
        Assert.Equal(ok.Body, sent.Body);
    }

    [Fact]
    public async Task A_failed_create_answers_a_problem_without_a_location()
    {
        Result<ProbeResponse> result = new DomainError(ErrorCodes.ConflictDuplicate, "Taken.");

        var sent = await SendAsync(endpoint => endpoint.Sender.CreatedOrProblemAsync(result, probe => $"/api/probes/{probe.Id}", Token));

        Assert.Equal(StatusCodes.Status409Conflict, sent.Status);
        Assert.Null(sent.Location);
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private static async Task<Sent> ThrownAsync(DomainError error)
    {
        var endpoint = CreateEndpoint();
        try
        {
            endpoint.Throw(error);
        }
        catch (ValidationFailureException exception)
        {
            await endpoint.Sender.ErrorsAsync(exception.StatusCode ?? StatusCodes.Status400BadRequest, Token);
        }

        return Read(endpoint);
    }

    private static async Task<Sent> SendAsync(Func<ProbeEndpoint, Task> send)
    {
        var endpoint = CreateEndpoint();
        await send(endpoint);
        return Read(endpoint);
    }

    private static ProbeEndpoint CreateEndpoint() =>
        Factory.Create<ProbeEndpoint>(context =>
        {
            context.TraceIdentifier = "probe-trace";
            context.Request.Path = "/api/probes";
            context.Response.Body = new MemoryStream();
        });

    private static Sent Read(ProbeEndpoint endpoint)
    {
        var response = endpoint.HttpContext.Response;
        var body = Encoding.UTF8.GetString(((MemoryStream)response.Body).ToArray());
        var location = response.Headers.Location.Count == 0 ? null : response.Headers.Location.ToString();
        return new Sent(response.StatusCode, response.ContentType, location, body, [.. endpoint.ValidationFailures]);
    }

    private static List<string> Describe(List<ValidationFailure> failures) =>
        [.. failures.Select(failure => $"{failure.PropertyName}|{failure.ErrorMessage}|{failure.ErrorCode}|{failure.Severity}|{failure.AttemptedValue}")];

    private sealed record Sent(int Status, string? ContentType, string? Location, string Body, List<ValidationFailure> Failures);

    public sealed record ProbeRequest(int Id);

    public sealed record ProbeResponse(int Id, string Name);

    public sealed class ProbeEndpoint : Endpoint<ProbeRequest, ProbeResponse>
    {
        public ResponseSender<ProbeRequest, ProbeResponse> Sender => Send;

        public void Throw(DomainError error) =>
            ThrowError(error.Message, error.Code, Severity.Error, ErrorCodes.StatusCodeFor(error.Code));
    }
}
