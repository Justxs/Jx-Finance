namespace JxFinance.Endpoints.Ping.Interfaces;

public sealed record PingStatus(string Message, DateTimeOffset TimestampUtc);

public interface IPingService
{
    PingStatus GetStatus();
}
