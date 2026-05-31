namespace JxFinance.Api.Features.Ping.GetPing;

public sealed record GetPingResponse(string Message, DateTimeOffset UtcNow);
