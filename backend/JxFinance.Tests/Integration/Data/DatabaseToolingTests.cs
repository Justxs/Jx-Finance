using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Data;

[Collection<IntegrationCollection>]
public sealed class DatabaseToolingTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public void Model_has_no_changes_without_a_migration()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.False(
            db.Database.HasPendingModelChanges(),
            "The EF model differs from the last migration. Run 'just migrate-add <Name>'.");
    }

    [Fact]
    public async Task Demo_data_fills_an_empty_user_and_refuses_a_second_run()
    {
        var user = await CreateUserAsync();

        await DemoDataCommand.RunAsync(Services, user.Email);

        var client = await LoginAsync(user);
        var accounts = await client.GetFromJsonAsync<JsonElement>("/api/accounts");
        var transactions = await client.GetFromJsonAsync<JsonElement>("/api/transactions?page=1&pageSize=5");
        Assert.Equal(3, accounts.GetArrayLength());
        Assert.True(transactions.GetProperty("total").GetInt32() > 50);
        await Assert.ThrowsAsync<InvalidOperationException>(() => DemoDataCommand.RunAsync(Services, user.Email));
    }
}
