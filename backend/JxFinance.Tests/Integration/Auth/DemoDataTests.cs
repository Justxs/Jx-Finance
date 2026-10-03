using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Auth;

[Collection<SetupCollection>]
public sealed class DemoDataTests(SetupFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/setup/demo-data";

    [Fact]
    public async Task Demo_data_is_loaded_during_the_guided_setup_and_removed_while_the_administrator_is_alone()
    {
        var loaded = await Client.PostAsync(Url, null, TestContext.Current.CancellationToken);
        var settingsAfterLoad = await SettingsAsync();
        var accountsAfterLoad = await CountAsync("/api/accounts");
        var loadedAgain = await Client.PostAsync(Url, null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, loaded.StatusCode);
        Assert.True(settingsAfterLoad.DemoData);
        Assert.Equal(3, accountsAfterLoad);
        await AssertProblemAsync(loadedAgain, HttpStatusCode.Conflict, "setup.ledgerNotEmpty");

        var removed = await Client.DeleteAsync(Url, TestContext.Current.CancellationToken);
        var settingsAfterRemove = await SettingsAsync();
        var removedAgain = await Client.DeleteAsync(Url, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.False(settingsAfterRemove.DemoData);
        Assert.Equal(0, await CountAsync("/api/accounts"));
        Assert.Equal(0, await CountAsync("/api/households"));
        Assert.Equal(StarterCategories.Count, await CountAsync("/api/categories"));
        await AssertProblemAsync(removedAgain, HttpStatusCode.Conflict, "setup.demoNotRemovable");

        Assert.Equal(HttpStatusCode.NoContent, (await Client.PostAsync(Url, null, TestContext.Current.CancellationToken)).StatusCode);
        using var member = await CreateUserClientAsync();
        var removedWithMember = await Client.DeleteAsync(Url, TestContext.Current.CancellationToken);
        var memberLoads = await member.PostAsync(Url, null, TestContext.Current.CancellationToken);

        await AssertProblemAsync(removedWithMember, HttpStatusCode.Conflict, "setup.demoNotRemovable");
        Assert.Equal(HttpStatusCode.Forbidden, memberLoads.StatusCode);

        (await Client.PostAsync("/api/setup/finish", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var afterFinish = await Client.PostAsync(Url, null, TestContext.Current.CancellationToken);

        await AssertProblemAsync(afterFinish, HttpStatusCode.Conflict, "setup.notPending");
    }

    private async Task<SettingsDto> SettingsAsync() =>
        (await Client.GetFromJsonAsync<SettingsDto>("/api/settings", TestContext.Current.CancellationToken))!;

    private async Task<int> CountAsync(string url) =>
        (await Client.GetFromJsonAsync<List<object>>(url, TestContext.Current.CancellationToken))!.Count;

    private sealed record SettingsDto(bool DemoData);
}
