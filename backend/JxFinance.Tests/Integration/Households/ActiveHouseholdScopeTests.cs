using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class ActiveHouseholdScopeTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ScopeHeader = "X-Active-Household";

    [Fact]
    public async Task Without_a_header_the_caller_sees_every_household_at_once()
    {
        var world = await TwoHouseholdsAsync();

        var accounts = await AccountsAsync(world.Client, null);

        Assert.Contains(accounts, a => a.Id == world.FirstAccount);
        Assert.Contains(accounts, a => a.Id == world.SecondAccount);
        Assert.Contains(accounts, a => a.Id == world.PersonalAccount);
    }

    [Fact]
    public async Task An_active_household_hides_the_other_household_and_keeps_personal_records()
    {
        var world = await TwoHouseholdsAsync();

        var accounts = await AccountsAsync(world.Client, world.First);
        var categories = await CategoriesAsync(world.Client, world.First);

        Assert.Contains(accounts, a => a.Id == world.FirstAccount);
        Assert.DoesNotContain(accounts, a => a.Id == world.SecondAccount);
        Assert.Contains(accounts, a => a.Id == world.PersonalAccount);
        Assert.Contains(categories, c => c.Id == world.FirstCategory);
        Assert.DoesNotContain(categories, c => c.Id == world.SecondCategory);
        Assert.Contains(categories, c => c.Id == world.PersonalCategory);
    }

    [Fact]
    public async Task The_other_household_narrows_the_other_way()
    {
        var world = await TwoHouseholdsAsync();

        var accounts = await AccountsAsync(world.Client, world.Second);

        Assert.DoesNotContain(accounts, a => a.Id == world.FirstAccount);
        Assert.Contains(accounts, a => a.Id == world.SecondAccount);
        Assert.Contains(accounts, a => a.Id == world.PersonalAccount);
    }

    [Fact]
    public async Task A_hidden_account_answers_404_and_takes_its_transactions_with_it()
    {
        var world = await TwoHouseholdsAsync();
        var entry = await CreateTransactionAsync(world.Client, world.SecondAccount, null, "expense", "5.00", "2026-06-10");

        var account = await SendAsync(world.Client, HttpMethod.Get, $"/api/accounts/{world.SecondAccount}", world.First);
        var page = await ReadAsync<PageDto<TransactionDto>>(
            await SendAsync(world.Client, HttpMethod.Get, "/api/transactions?pageSize=200", world.First));
        var everything = await ReadAsync<PageDto<TransactionDto>>(
            await SendAsync(world.Client, HttpMethod.Get, "/api/transactions?pageSize=200", null));

        Assert.Equal(HttpStatusCode.NotFound, account.StatusCode);
        Assert.DoesNotContain(page.Items, t => t.Id == entry.Id);
        Assert.Contains(everything.Items, t => t.Id == entry.Id);
    }

    [Fact]
    public async Task A_household_the_caller_does_not_belong_to_is_ignored()
    {
        var world = await TwoHouseholdsAsync();
        using var outsider = await CreateUserClientAsync();
        var theirHousehold = await NewHouseholdAsync(outsider, "Outsiders");
        var theirAccount = await CreateAccountAsync("50.00", householdId: theirHousehold, client: outsider);

        var accounts = await AccountsAsync(world.Client, theirHousehold);
        var theirs = await SendAsync(world.Client, HttpMethod.Get, $"/api/accounts/{theirAccount}", theirHousehold);

        Assert.Contains(accounts, a => a.Id == world.FirstAccount);
        Assert.Contains(accounts, a => a.Id == world.SecondAccount);
        Assert.DoesNotContain(accounts, a => a.Id == theirAccount);
        Assert.Equal(HttpStatusCode.NotFound, theirs.StatusCode);
    }

    [Fact]
    public async Task The_scope_never_widens_what_a_caller_may_see()
    {
        var world = await TwoHouseholdsAsync();
        using var outsider = await CreateUserClientAsync();
        var theirHousehold = await NewHouseholdAsync(outsider, "Outsiders");
        var theirAccount = await CreateAccountAsync("50.00", householdId: theirHousehold, client: outsider);
        var theirCategory = await NewCategoryAsync(outsider, theirHousehold);

        foreach (var header in new Guid?[] { null, theirHousehold, world.First, world.Second, Guid.NewGuid() })
        {
            var accounts = await AccountsAsync(world.Client, header);
            var categories = await CategoriesAsync(world.Client, header);
            var account = await SendAsync(world.Client, HttpMethod.Get, $"/api/accounts/{theirAccount}", header);

            Assert.DoesNotContain(accounts, a => a.Id == theirAccount);
            Assert.DoesNotContain(categories, c => c.Id == theirCategory);
            Assert.Equal(HttpStatusCode.NotFound, account.StatusCode);
        }
    }

    [Fact]
    public async Task A_malformed_header_is_ignored()
    {
        var world = await TwoHouseholdsAsync();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/accounts");
        request.Headers.Add(ScopeHeader, "not-a-guid");
        var accounts = await ReadAsync<List<AccountDto>>(await world.Client.SendAsync(request));

        Assert.Contains(accounts, a => a.Id == world.FirstAccount);
        Assert.Contains(accounts, a => a.Id == world.SecondAccount);
    }

    [Fact]
    public async Task A_transfer_across_two_households_stays_visible_through_the_account_in_the_scope()
    {
        var world = await TwoHouseholdsAsync();
        var transfer = await PostAsync<TransferDto>(
            world.Client,
            "/api/transfers",
            new { fromAccountId = world.FirstAccount, toAccountId = world.SecondAccount, amount = "10.00", date = "2026-06-10" });

        var listed = await ReadAsync<PageDto<TransferDto>>(
            await SendAsync(world.Client, HttpMethod.Get, "/api/transfers?pageSize=200", world.First));
        var edit = await SendAsync(
            world.Client,
            HttpMethod.Put,
            $"/api/transfers/{transfer.Id}",
            world.First,
            new { fromAccountId = world.FirstAccount, toAccountId = world.SecondAccount, amount = "11.00", date = "2026-06-10" });
        var editUnscoped = await SendAsync(
            world.Client,
            HttpMethod.Put,
            $"/api/transfers/{transfer.Id}",
            null,
            new { fromAccountId = world.FirstAccount, toAccountId = world.SecondAccount, amount = "11.00", date = "2026-06-10" });

        Assert.Contains(listed.Items, t => t.Id == transfer.Id);
        Assert.Equal(HttpStatusCode.Forbidden, edit.StatusCode);
        Assert.Equal(HttpStatusCode.OK, editUnscoped.StatusCode);
    }

    private sealed record World(
        HttpClient Client,
        Guid First,
        Guid Second,
        Guid FirstAccount,
        Guid SecondAccount,
        Guid PersonalAccount,
        Guid FirstCategory,
        Guid SecondCategory,
        Guid PersonalCategory);

    private async Task<World> TwoHouseholdsAsync()
    {
        var client = await CreateUserClientAsync();
        var first = await NewHouseholdAsync(client, "First");
        var second = await NewHouseholdAsync(client, "Second");
        return new World(
            client,
            first,
            second,
            await CreateAccountAsync("100.00", householdId: first, client: client),
            await CreateAccountAsync("200.00", householdId: second, client: client),
            await CreateAccountAsync("300.00", client: client),
            await NewCategoryAsync(client, first),
            await NewCategoryAsync(client, second),
            await NewCategoryAsync(client, null));
    }

    private static async Task<Guid> NewHouseholdAsync(HttpClient client, string name) =>
        (await PostAsync<IdDto>(client, "/api/households", new { name = $"{name} {Guid.NewGuid():N}" })).Id;

    private static async Task<Guid> NewCategoryAsync(HttpClient client, Guid? householdId) =>
        (await PostAsync<IdDto>(
            client,
            "/api/categories",
            new
            {
                name = $"Category {Guid.NewGuid():N}",
                type = "expense",
                scope = householdId is null ? "personal" : "shared",
                householdId,
            })).Id;

    private static Task<HttpResponseMessage> SendAsync(
        HttpClient client,
        HttpMethod method,
        string url,
        Guid? household,
        object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        if (household is not null)
        {
            request.Headers.Add(ScopeHeader, household.Value.ToString());
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return client.SendAsync(request);
    }

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        Assert.True(
            response.IsSuccessStatusCode,
            $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    private static async Task<List<AccountDto>> AccountsAsync(HttpClient client, Guid? household) =>
        await ReadAsync<List<AccountDto>>(await SendAsync(client, HttpMethod.Get, "/api/accounts", household));

    private static async Task<List<CategoryDto>> CategoriesAsync(HttpClient client, Guid? household) =>
        await ReadAsync<List<CategoryDto>>(await SendAsync(client, HttpMethod.Get, "/api/categories", household));

    private sealed record CategoryDto(Guid Id, string Name, string Type);
}
