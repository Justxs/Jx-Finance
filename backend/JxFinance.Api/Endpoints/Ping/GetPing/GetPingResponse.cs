namespace JxFinance.Endpoints.Ping.GetPing;

public sealed record GetPingResponse(string Message, DateTimeOffset UtcNow);
