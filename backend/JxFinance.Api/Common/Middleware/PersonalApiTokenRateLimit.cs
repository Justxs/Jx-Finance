using System.Globalization;
using System.Threading.RateLimiting;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.RateLimiting;

namespace JxFinance.Common.Middleware;

public static class PersonalApiTokenRateLimit
{
    public const int RequestsPerWindow = 60;

    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public static void Configure(RateLimiterOptions options)
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            context.User.FindFirst(AuthClaims.TokenId)?.Value is { } tokenId
                ? RateLimitPartition.GetFixedWindowLimiter(
                    tokenId,
                    _ => new FixedWindowRateLimiterOptions { PermitLimit = RequestsPerWindow, Window = Window, QueueLimit = 0 })
                : RateLimitPartition.GetNoLimiter(string.Empty));
        options.OnRejected = RejectAsync;
    }

    private static ValueTask RejectAsync(OnRejectedContext rejected, CancellationToken cancellationToken)
    {
        var retryAfter = rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var wait) ? wait : Window;
        rejected.HttpContext.Response.Headers.RetryAfter =
            ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        return new ValueTask(ProblemResponses.WriteAsync(
            rejected.HttpContext,
            new DomainError(
                ErrorCodes.TokenRateLimited,
                $"A personal API token may send {RequestsPerWindow} requests a minute. Wait before sending more.")));
    }
}
