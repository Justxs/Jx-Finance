using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<IntegrationCollection>]
public sealed class DebtBalanceHistoryTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Creating_and_editing_a_debt_records_balances_and_an_earlier_date_only_adds_history()
    {
        using var member = await CreateUserClientAsync();
        var debt = await PostAsync<DebtDto>(member, "/api/debts", Body("1000.00", Today.AddDays(-30)));
        Assert.Equal([new BalanceDto(Today.AddDays(-30), "1000.00", null)], await BalancesAsync(member, debt.Id));

        var edited = await ReadOkAsync<DebtDto>(await member.PutAsJsonAsync($"/api/debts/{debt.Id}", Body("900.00", Today.AddDays(-10)), TestContext.Current.CancellationToken));
        var earlier = await ReadOkAsync<DebtDto>(await member.PutAsJsonAsync($"/api/debts/{debt.Id}", Body("1100.00", Today.AddDays(-40)), TestContext.Current.CancellationToken));

        Assert.Equal(("900.00", Today.AddDays(-10)), (edited.OutstandingAmount, edited.AsOf));
        Assert.Equal(("900.00", Today.AddDays(-10)), (earlier.OutstandingAmount, earlier.AsOf));
        Assert.Equal(
            [
                new BalanceDto(Today.AddDays(-10), "900.00", null),
                new BalanceDto(Today.AddDays(-30), "1000.00", null),
                new BalanceDto(Today.AddDays(-40), "1100.00", null),
            ],
            await BalancesAsync(member, debt.Id));
    }

    [Fact]
    public async Task A_balance_is_replaced_on_its_date_and_deleting_the_newest_falls_back_but_never_the_last()
    {
        using var member = await CreateUserClientAsync();
        var debt = await PostAsync<DebtDto>(member, "/api/debts", Body("1000.00", Today.AddDays(-20)));
        var url = BalanceUrl(debt.Id, Today.AddDays(-5));
        (await member.PutAsJsonAsync(url, new { amount = "950.00", note = "Statement" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var replaced = await ReadOkAsync<DebtDto>(await member.PutAsJsonAsync(url, new { amount = "940.00", note = "  Bank app  " }, TestContext.Current.CancellationToken));

        Assert.Equal(("940.00", Today.AddDays(-5)), (replaced.OutstandingAmount, replaced.AsOf));
        Assert.Equal(new BalanceDto(Today.AddDays(-5), "940.00", "Bank app"), (await BalancesAsync(member, debt.Id))[0]);
        Assert.Equal("940.00", (await NetWorthAsync(member)).Debts);

        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync(url, TestContext.Current.CancellationToken)).StatusCode);
        var fallen = Assert.Single(await DebtsAsync(member));
        Assert.Equal(("1000.00", Today.AddDays(-20)), (fallen.OutstandingAmount, fallen.AsOf));
        await AssertProblemAsync(await member.DeleteAsync(url, TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(
            await member.DeleteAsync(BalanceUrl(debt.Id, Today.AddDays(-20)), TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "debt.lastBalance");
        Assert.Single(await BalancesAsync(member, debt.Id));
    }

    [Fact]
    public async Task A_future_date_or_a_negative_amount_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var debt = await PostAsync<DebtDto>(member, "/api/debts", Body("1000.00", Today));

        await AssertValidationErrorAsync(
            await member.PutAsJsonAsync(BalanceUrl(debt.Id, Today.AddDays(1)), new { amount = "1.00" }, TestContext.Current.CancellationToken),
            "date");
        await AssertValidationErrorAsync(
            await member.PutAsJsonAsync(BalanceUrl(debt.Id, Today), new { amount = "-1.00" }, TestContext.Current.CancellationToken),
            "amount");
    }

    [Fact]
    public async Task The_tracked_balance_starts_from_the_newest_recorded_balance()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var debt = (await PostAsync<DebtDto>(member, "/api/debts", Body("1000.00", "2026-05-01", tracksPayments: true))).Id;
        var payment = await CreateTransactionAsync(member, account, null, "expense", "100.00", "2026-05-25", "Loan");
        (await member.PostAsJsonAsync($"/api/debts/{debt}/payments", new { transactionId = payment.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal("900.00", Assert.Single(await DebtsAsync(member)).TrackedBalance);

        var recorded = await ReadOkAsync<DebtDto>(await member.PutAsJsonAsync(BalanceUrl(debt, new DateOnly(2026, 5, 20)), new { amount = "980.00" }, TestContext.Current.CancellationToken));

        Assert.Equal("880.00", recorded.TrackedBalance);
        Assert.Equal("880.00", (await NetWorthAsync(member)).Debts);
    }

    [Fact]
    public async Task Two_members_recording_the_same_new_date_at_once_get_a_conflict()
    {
        using var member = await CreateUserClientAsync();
        var debt = await PostAsync<DebtDto>(member, "/api/debts", Body("1000.00", Today.AddDays(-20)));
        var date = Today.AddDays(-3);
        await using var other = new NpgsqlConnection(ConnectionString);
        await other.OpenAsync(TestContext.Current.CancellationToken);
        await using var holding = await other.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (var insert = new NpgsqlCommand("""INSERT INTO "DebtBalanceEntries" ("DebtId", "Date", "Amount") VALUES (@debt, @date, 990)""", other, holding))
        {
            insert.Parameters.AddWithValue("debt", debt.Id);
            insert.Parameters.AddWithValue("date", date);
            await insert.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var writing = member.PutAsJsonAsync(BalanceUrl(debt.Id, date), new { amount = "980.00" }, TestContext.Current.CancellationToken);
        await WaitForBlockedWriteAsync();
        await holding.CommitAsync(TestContext.Current.CancellationToken);

        await AssertProblemAsync(await writing, HttpStatusCode.Conflict, "conflict.busy");
        Assert.Equal(new BalanceDto(date, "990.00", null), (await BalancesAsync(member, debt.Id))[0]);
    }

    [Fact]
    public async Task Another_member_cannot_see_or_change_the_balances()
    {
        using var owner = await CreateUserClientAsync();
        using var other = await CreateUserClientAsync();
        var debt = await PostAsync<DebtDto>(owner, "/api/debts", Body("100.00", Today));

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/debts/{debt.Id}/balances", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync(BalanceUrl(debt.Id, Today), new { amount = "1.00" }, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync(BalanceUrl(debt.Id, Today), TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal([new BalanceDto(Today, "100.00", null)], await BalancesAsync(owner, debt.Id));
    }

    [Fact]
    public async Task A_housemate_records_and_deletes_a_shared_debts_balances_and_the_activity_log_shows_them()
    {
        using var pair = await CreateHouseholdPairAsync();
        var debt = await PostAsync<DebtDto>(pair.OwnerClient, "/api/debts", Body("5000.00", Today.AddDays(-30), householdId: pair.HouseholdId));
        var day = Today.AddDays(-2);

        var recorded = await ReadOkAsync<DebtDto>(await pair.PartnerClient.PutAsJsonAsync(BalanceUrl(debt.Id, day), new { amount = "4800.00" }, TestContext.Current.CancellationToken));
        Assert.Equal("4800.00", recorded.OutstandingAmount);
        Assert.Equal(HttpStatusCode.NoContent, (await pair.PartnerClient.DeleteAsync(BalanceUrl(debt.Id, day), TestContext.Current.CancellationToken)).StatusCode);

        var events = (await ReadOkAsync<PageDto<AuditDto>>(await pair.OwnerClient.GetAsync(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken))).Items;
        var changes = events
            .Where(e => e.EntityId == debt.Id && e.Action == "updated" && e.ActorUserId == pair.Partner.Id)
            .Select(e => Assert.Single(e.Changes, c => c.Field == "balances"))
            .ToList();
        Assert.Contains(new ChangeDto("balances", null, $"{day:yyyy-MM-dd}: 4800.00 EUR"), changes);
        Assert.Contains(new ChangeDto("balances", $"{day:yyyy-MM-dd}: 4800.00 EUR", null), changes);
        Assert.Equal("5000.00", Assert.Single(await DebtsAsync(pair.OwnerClient)).OutstandingAmount);
    }

    [Fact]
    public async Task The_trash_keeps_the_balances_and_the_purge_removes_them()
    {
        using var member = await CreateUserClientAsync();
        var debt = await PostAsync<DebtDto>(member, "/api/debts", Body("100.00", Today.AddDays(-1)));
        (await member.PutAsJsonAsync(BalanceUrl(debt.Id, Today), new { amount = "90.00" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        (await member.DeleteAsync($"/api/debts/{debt.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "debt", entityId = debt.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal(2, (await BalancesAsync(member, debt.Id)).Count);

        (await member.DeleteAsync($"/api/debts/{debt.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var debtId = new DebtId(debt.Id);
        var old = DateTimeOffset.UtcNow.AddDays(-DeletionEntry.RetentionDays - 1);
        await WithDbAsync(db => db.Debts.IgnoreQueryFilters().Where(d => d.Id == debtId)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.UpdatedAt, old), TestContext.Current.CancellationToken));
        await Job<RetentionJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, await WithDbAsync(db => db.DebtBalanceEntries.CountAsync(e => e.DebtId == debtId, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task The_backfill_gives_every_debt_without_balances_one_and_touches_nothing_else()
    {
        using var member = await CreateUserClientAsync();
        var kept = await PostAsync<DebtDto>(member, "/api/debts", Body("700.00", Today.AddDays(-9)));
        var deleted = await PostAsync<DebtDto>(member, "/api/debts", Body("300.00", Today.AddDays(-8)));
        (await member.DeleteAsync($"/api/debts/{deleted.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        DebtId[] ids = [new(kept.Id), new(deleted.Id)];
        await WithDbAsync(db => db.DebtBalanceEntries.Where(e => ids.Contains(e.DebtId)).ExecuteDeleteAsync(TestContext.Current.CancellationToken));
        var before = await StampsAsync(ids);
        var audits = await AuditCountAsync(ids);

        var added = await WithDbAsync(db => DebtBalanceBackfill.RunAsync(db, TestContext.Current.CancellationToken));
        var again = await WithDbAsync(db => DebtBalanceBackfill.RunAsync(db, TestContext.Current.CancellationToken));

        Assert.True(added >= 2);
        Assert.Equal(0, again);
        var entries = await WithDbAsync(db => db.DebtBalanceEntries.Where(e => ids.Contains(e.DebtId))
            .OrderBy(e => e.Date)
            .Select(e => new { e.Date, e.Amount, e.Note })
            .ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal([(Today.AddDays(-9), 700m, (string?)null), (Today.AddDays(-8), 300m, null)], entries.Select(e => (e.Date, e.Amount, e.Note)));
        Assert.Equal(before, await StampsAsync(ids));
        Assert.Equal(audits, await AuditCountAsync(ids));
    }

    private async Task WaitForBlockedWriteAsync()
    {
        for (var attempt = 0; attempt < 100; attempt++)
        {
            var waiting = await SqlValueAsync<int>($"""SELECT count(*)::int AS "Value" FROM pg_locks WHERE NOT granted""");
            if (waiting > 0)
            {
                return;
            }

            await Task.Delay(50, TestContext.Current.CancellationToken);
        }

        Assert.Fail("The balance write never waited on the held row.");
    }

    private Task<List<DateTimeOffset>> StampsAsync(DebtId[] ids) =>
        WithDbAsync(db => db.Debts.IgnoreQueryFilters().Where(d => ids.Contains(d.Id)).OrderBy(d => d.AsOf).Select(d => d.UpdatedAt).ToListAsync(TestContext.Current.CancellationToken));

    private Task<int> AuditCountAsync(DebtId[] ids)
    {
        var raw = ids.Select(id => (Guid?)id.Value).ToList();
        return WithDbAsync(db => db.AuditEvents.IgnoreQueryFilters().CountAsync(e => raw.Contains(e.EntityId), TestContext.Current.CancellationToken));
    }

    private static string BalanceUrl(Guid debt, DateOnly date) => $"/api/debts/{debt}/balances/{date:yyyy-MM-dd}";

    private static object Body(string outstandingAmount, DateOnly asOf, bool tracksPayments = false, Guid? householdId = null) =>
        Body(outstandingAmount, asOf.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture), tracksPayments, householdId);

    private static object Body(string outstandingAmount, string asOf, bool tracksPayments = false, Guid? householdId = null) => new
    {
        name = "Car loan",
        type = "loan",
        outstandingAmount,
        asOf,
        tracksPayments,
        scope = householdId is null ? "personal" : "shared",
        householdId,
    };

    private static async Task<List<BalanceDto>> BalancesAsync(HttpClient client, Guid debt) =>
        (await client.GetFromJsonAsync<List<BalanceDto>>($"/api/debts/{debt}/balances", TestContext.Current.CancellationToken))!;

    private static async Task<List<DebtDto>> DebtsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken))!;

    private static async Task<NetWorthDto> NetWorthAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!;

    private sealed record DebtDto(Guid Id, string OutstandingAmount, DateOnly AsOf, string? TrackedBalance);

    private sealed record BalanceDto(DateOnly Date, string Amount, string? Note);

    private sealed record NetWorthDto(string Debts);

    private sealed record ChangeDto(string Field, string? From, string? To);

    private sealed record AuditDto(Guid ActorUserId, string Action, string EntityKind, Guid? EntityId, List<ChangeDto> Changes);
}
