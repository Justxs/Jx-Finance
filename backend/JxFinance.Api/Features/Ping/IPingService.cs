namespace JxFinance.Api.Features.Ping;

public sealed record PingStatus(string Message, DateTimeOffset TimestampUtc);

public interface IPingService
{
    PingStatus GetStatus();
}
