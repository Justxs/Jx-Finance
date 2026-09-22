using JxFinance.Infrastructure.Auth;

namespace JxFinance.Tests.Unit;

public sealed class SessionStateQueryTests
{
    [Fact]
    public async Task Validating_a_request_asks_the_database_once()
    {
        await using var capture = new SqlCapture();

        await JwtCookieAuthentication.SessionStateAsync(
            capture.Db,
            Guid.NewGuid(),
            Guid.NewGuid(),
            DateTimeOffset.UnixEpoch,
            TestContext.Current.CancellationToken);

        var sql = capture.OnlyStatement;
        Assert.Contains("\"SecurityStamp\"", sql, StringComparison.Ordinal);
        Assert.Contains("\"LockoutEnd\"", sql, StringComparison.Ordinal);
        Assert.Contains("\"UserSessions\"", sql, StringComparison.Ordinal);
        Assert.Contains("\"ExpiresAt\" > @", sql, StringComparison.Ordinal);
    }
}
