namespace JxFinance.Tests.Unit;

public sealed class AppDbContextTests
{
    [Fact]
    public async Task Saving_synchronously_is_not_supported()
    {
        await using var capture = new SqlCapture();

        Assert.Throws<NotSupportedException>(() => capture.Db.SaveChanges());
        Assert.Throws<NotSupportedException>(() => capture.Db.SaveChanges(acceptAllChangesOnSuccess: true));
    }
}
