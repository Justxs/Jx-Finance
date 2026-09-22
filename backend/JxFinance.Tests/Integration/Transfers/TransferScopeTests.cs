using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transfers;

[Collection<IntegrationCollection>]
public sealed class TransferScopeTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Deleting_a_cross_currency_transfer_returns_both_amounts()
    {
        using var member = await CreateUserClientAsync();
        var euros = await CreateAccountAsync("300.00", currency: "eur", client: member);
        var dollars = await CreateAccountAsync("5.00", currency: "usd", client: member);
        var transfer = await PostAsync<TransferDto>(
            member,
            "/api/transfers",
            new { fromAccountId = euros, toAccountId = dollars, amount = "100.00", receivedAmount = "108.50", date = "2026-06-06" });
        Assert.Equal(("eur", "108.50", "usd"), (transfer.Currency, transfer.ReceivedAmount, transfer.ReceivedCurrency));
        Assert.Equal("200.00", await CurrentBalanceAsync(euros, member));
        Assert.Equal("113.50", await CurrentBalanceAsync(dollars, member));

        var delete = await member.DeleteAsync($"/api/transfers/{transfer.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal("300.00", await CurrentBalanceAsync(euros, member));
        Assert.Equal("5.00", await CurrentBalanceAsync(dollars, member));
    }

    [Theory]
    [InlineData("0.00")]
    [InlineData("-1.00")]
    [InlineData("1.005")]
    public async Task Received_amount_must_be_positive_money(string receivedAmount)
    {
        var euros = await CreateAccountAsync("300.00", currency: "eur");
        var dollars = await CreateAccountAsync("0.00", currency: "usd");

        var response = await Client.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = euros, toAccountId = dollars, amount = "100.00", receivedAmount, date = "2026-06-06" }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "receivedAmount");
        Assert.Equal("300.00", await CurrentBalanceAsync(euros));
    }

    [Fact]
    public async Task A_transfer_between_a_personal_and_a_shared_account_is_visible_from_the_shared_side_only()
    {
        var partner = await CreateUserAsync();
        using var partnerClient = await LoginAsync(partner);
        using var stranger = await CreateUserClientAsync();
        var household = await CreateHouseholdAsync(partner);
        var shared = await CreateAccountAsync("100.00", householdId: household);
        var personal = await CreateAccountAsync("100.00");
        var transfer = await PostAsync<TransferDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = personal, toAccountId = shared, amount = "20.00", date = "2026-09-01" });

        var partnerList = await partnerClient.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=200", TestContext.Current.CancellationToken);
        var strangerList = await stranger.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=200", TestContext.Current.CancellationToken);

        Assert.Contains(partnerList!.Items, t => t.Id == transfer.Id);
        Assert.DoesNotContain(strangerList!.Items, t => t.Id == transfer.Id);
        Assert.Equal("120.00", await CurrentBalanceAsync(shared, partnerClient));
        Assert.Equal(HttpStatusCode.NotFound, (await partnerClient.GetAsync($"/api/accounts/{personal}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/transfers/{transfer.Id}", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Creating_a_transfer_needs_access_to_both_accounts()
    {
        var partner = await CreateUserAsync();
        using var partnerClient = await LoginAsync(partner);
        var household = await CreateHouseholdAsync(partner);
        var shared = await CreateAccountAsync("100.00", householdId: household);
        var adminsPersonal = await CreateAccountAsync("100.00");
        var partnersPersonal = await CreateAccountAsync("100.00", client: partnerClient);

        var intoHidden = await partnerClient.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = shared, toAccountId = adminsPersonal, amount = "10.00", date = "2026-09-01" }, TestContext.Current.CancellationToken);
        var fromHidden = await partnerClient.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = adminsPersonal, toAccountId = partnersPersonal, amount = "10.00", date = "2026-09-01" }, TestContext.Current.CancellationToken);
        var betweenVisible = await partnerClient.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = partnersPersonal, toAccountId = shared, amount = "10.00", date = "2026-09-01" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, intoHidden.StatusCode);
        Assert.Contains("reference.notFound", await intoHidden.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.BadRequest, fromHidden.StatusCode);
        Assert.Equal(HttpStatusCode.Created, betweenVisible.StatusCode);
        Assert.Equal("100.00", await CurrentBalanceAsync(adminsPersonal));
        Assert.Equal("110.00", await CurrentBalanceAsync(shared));
    }

    [Fact]
    public async Task The_owner_of_both_accounts_can_delete_a_transfer_a_partner_could_not()
    {
        var partner = await CreateUserAsync();
        using var partnerClient = await LoginAsync(partner);
        var household = await CreateHouseholdAsync(partner);
        var shared = await CreateAccountAsync("100.00", householdId: household);
        var personal = await CreateAccountAsync("100.00");
        var transfer = await PostAsync<TransferDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = shared, toAccountId = personal, amount = "20.00", date = "2026-09-01" });

        var byPartner = await partnerClient.DeleteAsync($"/api/transfers/{transfer.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("80.00", await CurrentBalanceAsync(shared, partnerClient));
        var byOwner = await Client.DeleteAsync($"/api/transfers/{transfer.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, byPartner.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, byOwner.StatusCode);
        Assert.Equal("100.00", await CurrentBalanceAsync(shared, partnerClient));
    }

    [Fact]
    public async Task Pages_are_newest_first_do_not_overlap_and_end_empty()
    {
        using var member = await CreateUserClientAsync();
        var from = await CreateAccountAsync("500.00", client: member);
        var to = await CreateAccountAsync(client: member);
        var created = new List<Guid>();
        for (var day = 1; day <= 5; day++)
        {
            created.Add((await PostAsync<TransferDto>(
                member,
                "/api/transfers",
                new { fromAccountId = from, toAccountId = to, amount = "1.00", date = $"2026-06-{day:00}" })).Id);
        }

        var first = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?page=1&pageSize=2", TestContext.Current.CancellationToken);
        var second = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?page=2&pageSize=2", TestContext.Current.CancellationToken);
        var third = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?page=3&pageSize=2", TestContext.Current.CancellationToken);
        var beyond = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?page=4&pageSize=2", TestContext.Current.CancellationToken);
        var byDate = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?date=2026-06-03", TestContext.Current.CancellationToken);
        var clamped = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?page=0&pageSize=1000", TestContext.Current.CancellationToken);

        created.Reverse();
        Assert.Equal(created, first!.Items.Concat(second!.Items).Concat(third!.Items).Select(t => t.Id));
        Assert.Equal((5, 2, 1), (first.Total, first.Items.Count, third.Items.Count));
        Assert.Empty(beyond!.Items);
        Assert.Equal(5, beyond.Total);
        Assert.Equal(created[2], Assert.Single(byDate!.Items).Id);
        Assert.Equal((1, 200, 5), (clamped!.Page, clamped.PageSize, clamped.Items.Count));
    }
}
