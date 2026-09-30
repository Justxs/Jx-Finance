using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Middleware;

public sealed class IdempotencyMiddleware(RequestDelegate next)
{
    private const string JsonContentType = "application/json; charset=utf-8";
    private const string ProblemContentType = "application/problem+json";

    private static readonly DomainError KeyTooLong = new(
        ErrorCodes.TextTooLong,
        $"The {ApiIdempotencyKey.HeaderName} header holds at most {ApiIdempotencyKey.KeyMaxLength} characters.");

    private static readonly DomainError KeyMalformed = new(
        ErrorCodes.TextInvalidFormat,
        $"The {ApiIdempotencyKey.HeaderName} header must be 1 to {ApiIdempotencyKey.KeyMaxLength} visible ASCII characters.");

    private static readonly DomainError KeyReused = new(
        ErrorCodes.IdempotencyKeyReused,
        $"This {ApiIdempotencyKey.HeaderName} was already used for a different request. Send a new key for a new request.");

    private static readonly DomainError StillRunning = new(
        ErrorCodes.ConflictBusy,
        $"The first request with this {ApiIdempotencyKey.HeaderName} is still running. Try again in a moment.");

    public async Task InvokeAsync(HttpContext context, AppDbContext db, IClock clock)
    {
        if (!HttpMethods.IsPost(context.Request.Method)
            || !context.Request.Headers.TryGetValue(ApiIdempotencyKey.HeaderName, out var header)
            || !Guid.TryParse(context.User.FindFirstValue(AuthClaims.TokenId), out var tokenId))
        {
            await next(context);
            return;
        }

        var key = header.ToString();
        if (KeyError(key) is { } invalid)
        {
            await ProblemResponses.WriteAsync(context, invalid);
            return;
        }

        var request = context.Request;
        request.EnableBuffering();
        using var body = new MemoryStream();
        await request.Body.CopyToAsync(body, context.RequestAborted);
        request.Body.Position = 0;
        var hash = RequestHash(
            request.Method,
            request.Path.Value ?? string.Empty,
            request.QueryString.Value ?? string.Empty,
            request.Headers[ActiveHousehold.HeaderName].ToString(),
            body.ToArray());

        var claim = new KeyClaim(db, tokenId, key);
        var outcome = await claim.TakeAsync(hash, Microseconds(clock.UtcNow), context.RequestAborted);
        if (outcome.Stored is { } stored)
        {
            await ReplayAsync(context, stored);
            return;
        }

        if (outcome.Refusal is { } refusal)
        {
            await ProblemResponses.WriteAsync(context, refusal);
            return;
        }

        await RunAsync(context, claim, outcome.ClaimedAt);
    }

    public static string RequestHash(string method, string path, string query, string household, ReadOnlySpan<byte> body)
    {
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        foreach (var part in new[] { method, path, query, household })
        {
            hash.AppendData(Encoding.UTF8.GetBytes(part));
            hash.AppendData([0]);
        }

        hash.AppendData(body);
        return Convert.ToHexStringLower(hash.GetHashAndReset());
    }

    private static DateTimeOffset Microseconds(DateTimeOffset instant) =>
        instant.AddTicks(-(instant.Ticks % TimeSpan.TicksPerMicrosecond));

    private static DomainError? KeyError(string key)
    {
        if (key.Length > ApiIdempotencyKey.KeyMaxLength)
        {
            return KeyTooLong;
        }

        return key.Length == 0 || key.Any(c => c is < '!' or > '~') ? KeyMalformed : null;
    }

    private async Task RunAsync(HttpContext context, KeyClaim claim, DateTimeOffset claimedAt)
    {
        var response = context.Response;
        var original = response.Body;
        using var buffer = new MemoryStream();
        response.Body = buffer;
        try
        {
            await next(context);
        }
        catch
        {
            response.Body = original;
            await claim.ReleaseAsync(claimedAt);
            throw;
        }

        response.Body = original;
        if (response.StatusCode >= StatusCodes.Status500InternalServerError)
        {
            await claim.ReleaseAsync(claimedAt);
        }
        else
        {
            var text = buffer.Length == 0 ? null : Encoding.UTF8.GetString(buffer.ToArray());
            var location = response.Headers.Location.ToString();
            await claim.StoreAsync(claimedAt, response.StatusCode, text, location.Length == 0 ? null : location);
        }

        buffer.Position = 0;
        await buffer.CopyToAsync(original, context.RequestAborted);
    }

    private static async Task ReplayAsync(HttpContext context, ApiIdempotencyKey stored)
    {
        var response = context.Response;
        response.StatusCode = stored.StatusCode!.Value;
        response.Headers[ApiIdempotencyKey.ReplayedHeaderName] = "true";
        if (stored.Location is { } location)
        {
            response.Headers.Location = location;
        }

        if (stored.Body is { } body)
        {
            response.ContentType = response.StatusCode >= StatusCodes.Status400BadRequest ? ProblemContentType : JsonContentType;
            await response.WriteAsync(body, context.RequestAborted);
        }
    }

    private sealed record ClaimOutcome(DateTimeOffset ClaimedAt, ApiIdempotencyKey? Stored = null, DomainError? Refusal = null);

    private sealed class KeyClaim(AppDbContext db, Guid tokenId, string key)
    {
        private IQueryable<ApiIdempotencyKey> Row => db.ApiIdempotencyKeys.Where(k => k.TokenId == tokenId && k.Key == key);

        public async Task<ClaimOutcome> TakeAsync(string hash, DateTimeOffset now, CancellationToken ct)
        {
            var inserted = await db.Database.ExecuteSqlAsync(
                $"""
                INSERT INTO "ApiIdempotencyKeys" ("TokenId", "Key", "RequestHash", "CreatedAt")
                VALUES ({tokenId}, {key}, {hash}, {now})
                ON CONFLICT DO NOTHING
                """,
                ct);
            if (inserted == 1)
            {
                return new ClaimOutcome(now);
            }

            var existing = await Row.AsNoTracking().FirstOrDefaultAsync(ct);
            if (existing is null)
            {
                return new ClaimOutcome(now, Refusal: StillRunning);
            }

            var expired = existing.CreatedAt <= now - ApiIdempotencyKey.Lifetime;
            if (!expired && existing.RequestHash != hash)
            {
                return new ClaimOutcome(now, Refusal: KeyReused);
            }

            if (!expired && existing.StatusCode is not null)
            {
                return new ClaimOutcome(now, Stored: existing);
            }

            if (!expired && existing.CreatedAt > now - ApiIdempotencyKey.ClaimTimeout)
            {
                return new ClaimOutcome(now, Refusal: StillRunning);
            }

            var taken = await Row
                .Where(k => k.CreatedAt == existing.CreatedAt)
                .ExecuteUpdateAsync(
                    s => s.SetProperty(k => k.RequestHash, hash)
                        .SetProperty(k => k.CreatedAt, now)
                        .SetProperty(k => k.StatusCode, (int?)null)
                        .SetProperty(k => k.Body, (string?)null)
                        .SetProperty(k => k.Location, (string?)null),
                    ct);
            return taken == 1 ? new ClaimOutcome(now) : new ClaimOutcome(now, Refusal: StillRunning);
        }

        public Task<int> StoreAsync(DateTimeOffset claimedAt, int statusCode, string? body, string? location) =>
            Row.Where(k => k.CreatedAt == claimedAt)
                .ExecuteUpdateAsync(
                    s => s.SetProperty(k => k.StatusCode, statusCode)
                        .SetProperty(k => k.Body, body)
                        .SetProperty(k => k.Location, location),
                    CancellationToken.None);

        public Task<int> ReleaseAsync(DateTimeOffset claimedAt) =>
            Row.Where(k => k.CreatedAt == claimedAt && k.StatusCode == null).ExecuteDeleteAsync(CancellationToken.None);
    }
}
