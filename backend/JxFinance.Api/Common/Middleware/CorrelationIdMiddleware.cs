using System.Buffers;
using Serilog.Context;

namespace JxFinance.Common.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-ID";

    public const int MaxLength = 64;

    private static readonly SearchValues<char> Allowed =
        SearchValues.Create("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.");

    public async Task InvokeAsync(HttpContext context)
    {
        var inbound = context.Request.Headers[HeaderName].ToString();
        var correlationId = inbound is { Length: > 0 and <= MaxLength } && !inbound.AsSpan().ContainsAnyExcept(Allowed)
            ? inbound
            : Guid.NewGuid().ToString("N");

        context.Response.Headers[HeaderName] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(context);
        }
    }
}
