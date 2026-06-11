namespace JxFinance.Endpoints.Ping;

public sealed record PingStatus(string Message, DateTimeOffset TimestampUtc);

public interface IPingService
{
    PingStatus GetStatus();
}
