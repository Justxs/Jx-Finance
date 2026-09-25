using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Households;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class AuditLogTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Creating_editing_deleting_and_restoring_a_shared_transaction_is_logged_with_old_and_new_values()
    {
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        var household = await CreateHouseholdAsync(member);
        var account = await CreateAccountAsync("100.00", householdId: household);
        var food = await CreateNamedCategoryAsync(memberClient, $"Food {Guid.NewGuid():N}"[..13]);
        var groceries = await CreateNamedCategoryAsync(memberClient, $"Groceries {Guid.NewGuid():N}"[..18]);

        var transaction = await CreateTransactionAsync(memberClient, account, food.Id, "expense", "40.00", "2026-09-01", "Maxima");
        var update = await memberClient.PutAsJsonAsync(
            $"/api/transactions/{transaction.Id}",
            new
            {
                id = transaction.Id,
                accountId = account,
                categoryId = groceries.Id,
                type = "expense",
                amount = "42.18",
                date = "2026-09-01",
                description = "Maxima",
            }, TestContext.Current.CancellationToken);
        update.EnsureSuccessStatusCode();
        (await memberClient.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await memberClient.PostAsJsonAsync("/api/trash/restore", new { kind = "transaction", entityId = transaction.Id }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        var events = (await AuditAsync(Client, household)).Items.Where(e => e.EntityId == transaction.Id).ToList();

        Assert.Equal(["restored", "deleted", "updated", "created"], events.Select(e => e.Action));
        Assert.All(events, e =>
        {
            Assert.Equal("transaction", e.EntityKind);
            Assert.Equal(member.Id, e.ActorUserId);
            Assert.Equal("Test User", e.ActorName);
        });
        Assert.Equal("Maxima, 42.18 EUR", events[0].Description);
        Assert.Equal("Maxima, 40.00 EUR", events[3].Description);
        var changes = events[2].Changes;
        Assert.Contains(new ChangeDto("amount", "40.00 EUR", "42.18 EUR"), changes);
        Assert.Contains(new ChangeDto("category", food.Name, groceries.Name), changes);
        Assert.Equal(2, changes.Count);
        Assert.All(events.Where(e => e.Action != "updated"), e => Assert.Empty(e.Changes));
    }

    [Fact]
    public async Task Personal_records_are_never_logged()
    {
        var household = await CreateHouseholdAsync();
        var account = await CreateAccountAsync("10.00");
        var category = await CreateCategoryAsync();
        var tag = await CreateTagAsync();
        var transaction = await CreateTransactionAsync(Client, account, category, "expense", "4.00", "2026-09-02", "Personal");
        (await Client.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var events = (await AuditAsync(Client, household)).Items;

        Assert.Equal("household", Assert.Single(events).EntityKind);
        Assert.Equal("created", events[0].Action);
        Guid?[] personal = [account, category, tag, transaction.Id];
        await WithDbAsync(async db => Assert.False(await db.AuditEvents.AnyAsync(
            e => personal.Contains(e.EntityId),
            TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Sharing_membership_and_renaming_are_logged()
    {
        var member = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);
        var account = await CreateAccountAsync("5.00");
        var name = $"Joint {Guid.NewGuid():N}"[..14];

        (await Client.PutAsJsonAsync(
            $"/api/accounts/{account}",
            new { name, type = "checking", startingBalance = "5.00", scope = "shared", householdId = household }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await Client.PutAsJsonAsync(
            $"/api/accounts/{account}",
            new { name, type = "checking", startingBalance = "5.00", scope = "personal" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await Client.PutAsJsonAsync($"/api/households/{household}/members/{member.Id}", new { role = "owner" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await Client.PutAsJsonAsync($"/api/households/{household}", new { id = household, name = "Renamed home" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await Client.DeleteAsync($"/api/households/{household}/members/{member.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var events = (await AuditAsync(Client, household)).Items;

        Assert.Equal(
            ["memberRemoved", "renamed", "memberRoleChanged", "unshared", "shared", "memberAdded", "created"],
            events.Select(e => e.Action));
        Assert.All(events.Where(e => e.EntityKind == "account"), e =>
        {
            Assert.Equal(account, e.EntityId);
            Assert.Equal(name, e.Description);
        });
        var role = events.Single(e => e.Action == "memberRoleChanged");
        Assert.Equal(member.Id, role.EntityId);
        Assert.Equal("Test User", role.Description);
        Assert.Equal(new ChangeDto("role", "member", "owner"), Assert.Single(role.Changes));
        var renamed = events.Single(e => e.Action == "renamed");
        Assert.Equal("Renamed home", renamed.Description);
        Assert.Equal("Renamed home", Assert.Single(renamed.Changes).To);
    }

    [Fact]
    public async Task Only_members_can_read_the_log_and_an_active_household_hides_the_others()
    {
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        using var outsider = await CreateUserClientAsync();
        var household = await CreateHouseholdAsync(member);
        var other = await CreateHouseholdAsync(member);

        Assert.Equal(HttpStatusCode.OK, (await memberClient.GetAsync($"/api/households/{household}/audit", TestContext.Current.CancellationToken)).StatusCode);
        await AssertProblemAsync(
            await outsider.GetAsync($"/api/households/{household}/audit", TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            "resource.notFound");
        Assert.Equal(HttpStatusCode.NotFound, (await memberClient.GetAsync($"/api/households/{Guid.NewGuid()}/audit", TestContext.Current.CancellationToken)).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await SendScopedAsync(memberClient, HttpMethod.Get, $"/api/households/{household}/audit", household)).StatusCode);
        await AssertProblemAsync(
            await SendScopedAsync(memberClient, HttpMethod.Get, $"/api/households/{household}/audit", other),
            HttpStatusCode.NotFound,
            "resource.notFound");
    }

    [Fact]
    public async Task Each_household_sees_only_its_own_rows_and_a_transfer_between_two_is_in_both()
    {
        var first = await CreateHouseholdAsync();
        var second = await CreateHouseholdAsync();
        var firstAccount = await CreateAccountAsync("100.00", householdId: first);
        var secondAccount = await CreateAccountAsync("100.00", householdId: second);
        var transaction = await CreateTransactionAsync(Client, firstAccount, null, "expense", "3.00", "2026-09-03", "Only first");
        var transfer = await PostAsync<IdDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = firstAccount, toAccountId = secondAccount, amount = "20.00", date = "2026-09-03" });

        var firstLog = (await AuditAsync(Client, first)).Items;
        var secondLog = (await AuditAsync(Client, second)).Items;

        Assert.Contains(firstLog, e => e.EntityId == transaction.Id);
        Assert.DoesNotContain(secondLog, e => e.EntityId == transaction.Id);
        Assert.Contains(firstLog, e => e.EntityId == transfer.Id && e.Action == "created");
        Assert.Contains(secondLog, e => e.EntityId == transfer.Id && e.Action == "created");
        Assert.DoesNotContain(secondLog, e => e.EntityId == firstAccount);
    }

    [Fact]
    public async Task The_log_filters_by_member_kind_and_date_and_pages_newest_first()
    {
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        var household = await CreateHouseholdAsync(member);
        var account = await CreateAccountAsync("100.00", householdId: household);
        for (var i = 0; i < 3; i++)
        {
            await CreateTransactionAsync(memberClient, account, null, "expense", $"{i + 1}.00", "2026-09-04", $"Row {i}");
        }

        var all = await AuditAsync(Client, household);
        var byMember = await AuditAsync(Client, household, $"memberId={member.Id}");
        var byKind = await AuditAsync(Client, household, "kind=account");
        var paged = await AuditAsync(Client, household, "pageSize=2&page=2");
        var tomorrow = Today.AddDays(1).ToString("yyyy-MM-dd");
        var yesterday = Today.AddDays(-1).ToString("yyyy-MM-dd");
        var today = Today.ToString("yyyy-MM-dd");
        var future = await AuditAsync(Client, household, $"dateFrom={tomorrow}");
        var past = await AuditAsync(Client, household, $"dateTo={yesterday}");
        var todayOnly = await AuditAsync(Client, household, $"dateFrom={today}&dateTo={today}");

        Assert.Equal(6, all.Total);
        Assert.True(all.Items.Zip(all.Items.Skip(1)).All(pair => pair.First.OccurredAt >= pair.Second.OccurredAt));
        Assert.Equal(["Row 2, 3.00 EUR", "Row 1, 2.00 EUR", "Row 0, 1.00 EUR"], all.Items.Take(3).Select(e => e.Description));
        Assert.Equal(3, byMember.Total);
        Assert.All(byMember.Items, e => Assert.Equal(member.Id, e.ActorUserId));
        Assert.Equal("account", Assert.Single(byKind.Items).EntityKind);
        Assert.Equal(2, paged.Items.Count);
        Assert.Equal(6, paged.Total);
        Assert.Equal(all.Items.Skip(2).Take(2).Select(e => e.Id), paged.Items.Select(e => e.Id));
        Assert.Equal(0, future.Total);
        Assert.Equal(0, past.Total);
        Assert.Equal(6, todayOnly.Total);

        await AssertProblemAsync(
            await Client.GetAsync($"/api/households/{household}/audit?dateFrom={tomorrow}&dateTo={yesterday}", TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "range.invalid");
    }

    [Fact]
    public async Task An_import_and_a_bulk_edit_are_each_one_summarising_row()
    {
        var household = await CreateHouseholdAsync();
        var account = await CreateAccountAsync("100.00", householdId: household);
        var marker = Guid.NewGuid().ToString("N")[..8];
        var rows = Enumerable.Range(0, 3)
            .Select(i => new
            {
                importRef = $"AUDIT-{marker}-{i}",
                amount = "1.00",
                type = "expense",
                date = new DateOnly(2026, 9, 5),
                description = $"Imported {i}",
            })
            .ToArray();
        await PostAsync<IdDto>(Client, "/api/import/swedbank/confirm", new { accountId = account, rows });
        var imported = await Client.GetFromJsonAsync<PageDto<IdDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken);
        var category = await CreateCategoryAsync();
        (await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = imported!.Items.Select(t => t.Id), categoryId = category }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        var events = (await AuditAsync(Client, household)).Items.Where(e => e.EntityKind == "transaction").ToList();

        Assert.Equal(2, events.Count);
        var bulk = events[0];
        Assert.Equal("updated", bulk.Action);
        Assert.Equal(3, bulk.Count);
        Assert.Null(bulk.EntityId);
        Assert.EndsWith("3 transactions", bulk.Description);
        var import = events[1];
        Assert.Equal("imported", import.Action);
        Assert.Equal(3, import.Count);
        Assert.Equal(account, import.EntityId);
        Assert.StartsWith("Swedbank CSV into Account ", import.Description);
        Assert.EndsWith("3 entries", import.Description);
    }

    [Fact]
    public async Task A_broker_statement_is_one_summarising_row()
    {
        var household = await CreateHouseholdAsync();
        var account = await CreateAccountAsync("1000.00", "investment", "eur", household);
        var symbol = NewSymbol();
        var report = $"""
            <FlexQueryResponse queryName="JxFinance" type="AF">
              <FlexStatements count="1">
                <FlexStatement accountId="U7654321" fromDate="20260601" toDate="20260630">
                  <Trades>
                    <Trade assetCategory="STK" subCategory="ETF" symbol="{symbol}" description="AUDIT FUND" listingExchange="IBIS2" currency="EUR" tradeDate="20260602" quantity="1" tradePrice="100" proceeds="-100" ibCommission="-1" ibCommissionCurrency="EUR" buySell="BUY" tradeID="{Random.Shared.Next()}" levelOfDetail="EXECUTION" />
                    <Trade assetCategory="STK" subCategory="ETF" symbol="{symbol}" description="AUDIT FUND" listingExchange="IBIS2" currency="EUR" tradeDate="20260603" quantity="2" tradePrice="100" proceeds="-200" ibCommission="-1" ibCommissionCurrency="EUR" buySell="BUY" tradeID="{Random.Shared.Next()}" levelOfDetail="EXECUTION" />
                  </Trades>
                </FlexStatement>
              </FlexStatements>
            </FlexQueryResponse>
            """;
        (await UploadFlexAsync(Client, account, report)).EnsureSuccessStatusCode();

        var events = (await AuditAsync(Client, household)).Items
            .Where(e => e.EntityKind == "investmentTransaction")
            .ToList();

        var import = Assert.Single(events);
        Assert.Equal("imported", import.Action);
        Assert.Equal(2, import.Count);
        Assert.Equal(account, import.EntityId);
        Assert.StartsWith("Interactive Brokers statement into Account ", import.Description);
        Assert.EndsWith("2 trades", import.Description);
    }

    [Fact]
    public async Task Shared_categories_tags_archiving_and_household_deletion_are_logged()
    {
        var household = await CreateHouseholdAsync();
        var category = await PostAsync<IdDto>(
            Client,
            "/api/categories",
            new { name = "Shared food", type = "expense", scope = "shared", householdId = household });
        var tag = await CreateTagAsync($"Shared {Guid.NewGuid():N}"[..15], household);
        var account = await CreateAccountAsync("1.00", householdId: household);
        (await Client.DeleteAsync($"/api/accounts/{account}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.PostAsync($"/api/accounts/{account}/restore", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.DeleteAsync($"/api/households/{household}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/households/{household}/audit", TestContext.Current.CancellationToken)).StatusCode);
        (await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "household", entityId = household }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        var events = (await AuditAsync(Client, household)).Items;

        Assert.Equal(
            [
                ("restored", "household"), ("deleted", "household"), ("restored", "account"), ("deleted", "account"),
                ("created", "account"), ("created", "tag"), ("created", "category"), ("created", "household"),
            ],
            events.Select(e => (e.Action, e.EntityKind)));
        Assert.Equal(category.Id, events.Single(e => e.EntityKind == "category").EntityId);
        Assert.Equal(tag, events.Single(e => e.EntityKind == "tag").EntityId);
        Assert.Equal("Shared food", events.Single(e => e.EntityKind == "category").Description);
    }

    [Fact]
    public async Task The_retention_job_prunes_rows_older_than_the_retention_period()
    {
        var household = await CreateHouseholdAsync();
        var admin = (await AuditAsync(Client, household)).Items.Single().ActorUserId;
        var old = new AuditEvent
        {
            HouseholdId = new HouseholdId(household),
            ActorUserId = admin,
            OccurredAt = DateTimeOffset.UtcNow.AddDays(-AuditEvent.RetentionDays - 1),
            Action = AuditAction.Updated,
            EntityKind = AuditEntityKind.Household,
            EntityId = household,
            Description = "Old",
        };
        var kept = new AuditEvent
        {
            HouseholdId = new HouseholdId(household),
            ActorUserId = admin,
            OccurredAt = DateTimeOffset.UtcNow.AddDays(-AuditEvent.RetentionDays + 1),
            Action = AuditAction.Updated,
            EntityKind = AuditEntityKind.Household,
            EntityId = household,
            Description = "Kept",
        };
        await WithDbAsync(async db =>
        {
            db.AuditEvents.AddRange(old, kept);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

        await new RetentionJob(
            Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<RetentionJob>.Instance).RunOnceAsync(TestContext.Current.CancellationToken);

        var descriptions = (await AuditAsync(Client, household)).Items.Select(e => e.Description).ToList();
        Assert.DoesNotContain("Old", descriptions);
        Assert.Contains("Kept", descriptions);
    }

    private static async Task<CategoryDto> CreateNamedCategoryAsync(HttpClient client, string name) =>
        new(await Seed.CategoryAsync(client, name), name);

    private static async Task<PageDto<AuditDto>> AuditAsync(HttpClient client, Guid household, string query = "")
    {
        var paging = query.Contains("pageSize=", StringComparison.Ordinal) ? "" : "pageSize=50&";
        return await ReadOkAsync<PageDto<AuditDto>>(
            await client.GetAsync($"/api/households/{household}/audit?{paging}{query}", TestContext.Current.CancellationToken));
    }

    private sealed record CategoryDto(Guid Id, string Name);

    private sealed record ChangeDto(string Field, string? From, string? To);

    private sealed record AuditDto(
        Guid Id,
        DateTimeOffset OccurredAt,
        Guid ActorUserId,
        string ActorName,
        string Action,
        string EntityKind,
        Guid? EntityId,
        string Description,
        int? Count,
        List<ChangeDto> Changes);
}
