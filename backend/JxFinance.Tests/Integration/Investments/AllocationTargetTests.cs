using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class AllocationTargetTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/investments/allocation-targets";

    [Fact]
    public async Task A_member_without_targets_reads_no_dimension_and_no_targets()
    {
        using var client = await CreateUserClientAsync();

        var targets = await ReadAsync(client);

        Assert.Null(targets.Dimension);
        Assert.Empty(targets.Targets);
    }

    [Fact]
    public async Task Saved_targets_are_read_back_largest_first()
    {
        using var client = await CreateUserClientAsync();

        var saved = await ReadOkAsync<TargetsDto>(await SaveAsync(client, "type", ("stock", "12.5"), ("etf", "70"), ("bond", "17.5")));
        var read = await ReadAsync(client);

        Assert.Equal("type", saved.Dimension);
        Assert.Equal(["etf", "bond", "stock"], read.Targets.Select(t => t.Key));
        Assert.Equal(["70", "17.5", "12.5"], read.Targets.Select(t => t.Share));
        Assert.All(read.Targets, t => Assert.Null(t.Symbol));
    }

    [Fact]
    public async Task Saving_replaces_every_target_and_an_empty_list_removes_them()
    {
        using var client = await CreateUserClientAsync();
        await ReadOkAsync<TargetsDto>(await SaveAsync(client, "type", ("etf", "100")));

        var currencies = await ReadOkAsync<TargetsDto>(await SaveAsync(client, "currency", ("eur", "60"), ("usd", "40")));
        var cleared = await ReadOkAsync<TargetsDto>(await SaveAsync(client, "currency"));
        var read = await ReadAsync(client);

        Assert.Equal(("currency", 2), (currencies.Dimension, currencies.Targets.Count));
        Assert.DoesNotContain(currencies.Targets, t => t.Key == "etf");
        Assert.Null(cleared.Dimension);
        Assert.Empty(read.Targets);
    }

    [Fact]
    public async Task A_security_target_answers_its_symbol_and_an_unknown_security_is_refused()
    {
        using var client = await CreateUserClientAsync();
        var symbol = NewSymbol();
        var fund = await CreateSecurityAsync(client, symbol);

        var saved = await ReadOkAsync<TargetsDto>(await SaveAsync(client, "security", (fund.ToString(), "100")));
        var unknown = await SaveAsync(client, "security", (Guid.NewGuid().ToString(), "100"));

        var target = Assert.Single(saved.Targets);
        Assert.Equal((fund.ToString(), symbol), (target.Key, target.Symbol));
        await AssertProblemAsync(unknown, HttpStatusCode.BadRequest, "allocation.bucketUnknown");
        Assert.Single((await ReadAsync(client)).Targets);
    }

    [Fact]
    public async Task Shares_that_do_not_add_up_to_100_are_refused()
    {
        using var client = await CreateUserClientAsync();

        var response = await SaveAsync(client, "type", ("etf", "60"), ("stock", "30"));

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "allocation.sharesTotal");
        await AssertValidationErrorAsync(response, "targets");
    }

    [Theory]
    [InlineData("101")]
    [InlineData("-1")]
    [InlineData("33.335")]
    public async Task A_share_outside_0_to_100_or_with_more_than_two_decimals_is_refused(string share)
    {
        using var client = await CreateUserClientAsync();

        var response = await SaveAsync(client, "type", ("etf", share), ("stock", "0"));

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "allocation.shareInvalid");
    }

    [Theory]
    [InlineData("type", "house")]
    [InlineData("type", "Etf")]
    [InlineData("currency", "EUR")]
    [InlineData("currency", "etf")]
    [InlineData("security", "not-a-guid")]
    public async Task A_bucket_that_does_not_belong_to_the_dimension_is_refused(string dimension, string key)
    {
        using var client = await CreateUserClientAsync();

        var response = await SaveAsync(client, dimension, (key, "100"));

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "allocation.bucketUnknown");
        await AssertValidationErrorAsync(response, "targets[0]");
    }

    [Fact]
    public async Task A_bucket_named_twice_is_refused()
    {
        using var client = await CreateUserClientAsync();

        var response = await SaveAsync(client, "type", ("etf", "50"), ("etf", "50"));

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "allocation.bucketDuplicate");
    }

    [Fact]
    public async Task Targets_belong_to_one_member_even_inside_a_household()
    {
        using var pair = await CreateHouseholdPairAsync();
        await ReadOkAsync<TargetsDto>(await SaveAsync(pair.OwnerClient, "type", ("etf", "100")));

        var partner = await ReadAsync(pair.PartnerClient);
        var owner = await GetScopedAsync<TargetsDto>(pair.OwnerClient, Url, pair.HouseholdId);

        Assert.Empty(partner.Targets);
        Assert.Equal("etf", Assert.Single(owner.Targets).Key);
    }

    private static async Task<TargetsDto> ReadAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<TargetsDto>(Url, TestContext.Current.CancellationToken))!;

    private static Task<HttpResponseMessage> SaveAsync(HttpClient client, string dimension, params (string Key, string Share)[] targets) =>
        client.PutAsJsonAsync(
            Url,
            new { dimension, targets = targets.Select(t => new { key = t.Key, share = t.Share }) },
            TestContext.Current.CancellationToken);

    private sealed record TargetDto(string Key, string Share, string? Symbol);

    private sealed record TargetsDto(string? Dimension, List<TargetDto> Targets);
}
