using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Auth;

[Collection<PeopleCollection>]
public sealed class SetupTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Setup_signs_the_administrator_in_and_leaves_the_guided_setup_pending_until_finished()
    {
        var before = await SettingsAsync(Client);

        var finished = await Client.PostAsync("/api/setup/finish", null, TestContext.Current.CancellationToken);
        var again = await Client.PostAsync("/api/setup/finish", null, TestContext.Current.CancellationToken);
        var after = await SettingsAsync(Client);

        Assert.True(before.SetupPending);
        Assert.Equal(HttpStatusCode.NoContent, finished.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.False(after.SetupPending);
    }

    [Fact]
    public async Task Only_an_administrator_can_finish_the_guided_setup()
    {
        using var member = await CreateUserClientAsync();
        using var anonymous = CreateClient(handleCookies: false);

        var asMember = await member.PostAsync("/api/setup/finish", null, TestContext.Current.CancellationToken);
        var signedOut = await anonymous.PostAsync("/api/setup/finish", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, asMember.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, signedOut.StatusCode);
    }

    [Fact]
    public async Task The_readiness_says_what_the_server_has_installed_to_administrators_only()
    {
        using var member = await CreateUserClientAsync();

        var readiness = await Client.GetFromJsonAsync<ReadinessDto>("/api/setup/readiness", TestContext.Current.CancellationToken);
        var asMember = await member.GetAsync("/api/setup/readiness", TestContext.Current.CancellationToken);

        Assert.True(readiness!.ReceiptReaderInstalled);
        Assert.Equal(HttpStatusCode.Forbidden, asMember.StatusCode);
    }

    private static async Task<SettingsDto> SettingsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<SettingsDto>("/api/settings", TestContext.Current.CancellationToken))!;

    private sealed record SettingsDto(bool SetupPending);

    private sealed record ReadinessDto(bool ReceiptReaderInstalled);
}
