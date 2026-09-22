using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection<IntegrationCollection>]
public sealed class MigrationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Migrations_are_applied_on_startup()
    {
        await WithDbAsync(async db =>
        {
            var applied = await db.Database.GetAppliedMigrationsAsync(TestContext.Current.CancellationToken);
            Assert.Contains(applied, name => name.EndsWith("InitialCreate", StringComparison.Ordinal));

            var pending = await db.Database.GetPendingMigrationsAsync(TestContext.Current.CancellationToken);
            Assert.Empty(pending);
        });
    }
}
