using JxFinance.Infrastructure.Persistence;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection(IntegrationCollection.Name)]
public sealed class MigrationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Migrations_are_applied_on_startup()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var applied = await db.Database.GetAppliedMigrationsAsync();
        Assert.Contains(applied, name => name.EndsWith("InitialCreate", StringComparison.Ordinal));

        var pending = await db.Database.GetPendingMigrationsAsync();
        Assert.Empty(pending);
    }
}
