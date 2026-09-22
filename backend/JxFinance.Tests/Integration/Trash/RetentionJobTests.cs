using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration.Trash;

[Collection<IntegrationCollection>]
public sealed class RetentionJobTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Date = "2026-06-05";

    [Fact]
    public async Task A_delete_stamps_the_row_and_its_trash_entry_at_the_same_instant()
    {
        using var member = await CreateUserClientAsync();
        var goal = await PostAsync<IdDto>(
            member,
            "/api/goals",
            new { name = "Atostogos", targetAmount = "500.00", currentAmount = "10.00" });

        (await member.DeleteAsync($"/api/goals/{goal.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var stamps = await WithDbAsync(async db =>
        {
            var goalId = new GoalId(goal.Id);
            var row = await db.Goals.IgnoreQueryFilters().SingleAsync(g => g.Id == goalId, TestContext.Current.CancellationToken);
            var entry = await db.DeletionEntries.IgnoreQueryFilters()
                .SingleAsync(e => e.EntityId == goal.Id, TestContext.Current.CancellationToken);
            return (row.UpdatedAt, entry.DeletedAt);
        });

        Assert.Equal(stamps.DeletedAt, stamps.UpdatedAt);
    }

    [Fact]
    public async Task A_record_deleted_inside_the_window_is_left_alone()
    {
        using var member = await CreateUserClientAsync();
        var goal = await PostAsync<IdDto>(
            member,
            "/api/goals",
            new { name = "Namai", targetAmount = "900.00", currentAmount = "0.00" });
        (await member.DeleteAsync($"/api/goals/{goal.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        await RunAsync();

        Assert.Equal(1, await CountAsync(db => db.Goals.IgnoreQueryFilters().Where(g => g.Id == new GoalId(goal.Id))));
        var restore = await member.PostAsJsonAsync(
            "/api/trash/restore",
            new { kind = "goal", entityId = goal.Id },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
    }

    [Fact]
    public async Task An_expired_transaction_loses_its_row_its_tag_links_and_its_trash_entry()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var tag = await CreateTagAsync(client: member);
        var transaction = await RecordTransactionAsync(
            member,
            new { accountId = account, type = "expense", amount = "12.30", date = Date, description = "Maistas", tagIds = new[] { tag } });
        (await member.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await BackdateAsync(transaction.Id);

        await RunAsync();

        var typedId = new Domain.Transactions.TransactionId(transaction.Id);
        Assert.Equal(0, await CountAsync(db => db.Transactions.IgnoreQueryFilters().Where(t => t.Id == typedId)));
        Assert.Equal(0, await CountAsync(db => db.TransactionTags.Where(t => t.TransactionId == typedId)));
        Assert.Equal(0, await CountAsync(db => db.DeletionEntries.IgnoreQueryFilters().Where(e => e.EntityId == transaction.Id)));
    }

    [Fact]
    public async Task An_expired_session_goes_and_the_signed_in_one_stays()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var expired = Guid.NewGuid();
        await WithDbAsync(async db =>
        {
            var stamp = await db.UserSessions
                .Where(s => s.UserId == user.Id)
                .Select(s => s.SecurityStamp)
                .FirstAsync(TestContext.Current.CancellationToken);
            db.Add(new UserSession
            {
                Id = expired,
                UserId = user.Id,
                SecurityStamp = stamp,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-40),
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(-10),
                LastSeenAt = DateTimeOffset.UtcNow.AddDays(-10),
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

        await RunAsync();

        Assert.Equal(0, await CountAsync(db => db.UserSessions.Where(s => s.Id == expired)));
        Assert.Equal(1, await CountAsync(db => db.UserSessions.Where(s => s.UserId == user.Id)));
        (await member.GetAsync("/api/auth/sessions", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
    }

    private Task RunAsync() =>
        new RetentionJob(
            Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<RetentionJob>.Instance).RunOnceAsync(TestContext.Current.CancellationToken);

    private Task BackdateAsync(Guid entityId)
    {
        var old = DateTimeOffset.UtcNow.AddDays(-DeletionEntry.RetentionDays - 1);
        var typedId = new Domain.Transactions.TransactionId(entityId);
        return WithDbAsync(async db =>
        {
            await db.Transactions.IgnoreQueryFilters()
                .Where(t => t.Id == typedId)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.UpdatedAt, old), TestContext.Current.CancellationToken);
            await db.DeletionEntries.IgnoreQueryFilters()
                .Where(e => e.EntityId == entityId)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.DeletedAt, old), TestContext.Current.CancellationToken);
        });
    }

    private Task<int> CountAsync<TEntity>(Func<Infrastructure.Data.AppDbContext, IQueryable<TEntity>> rows)
        where TEntity : class =>
        WithDbAsync(db => rows(db).CountAsync(TestContext.Current.CancellationToken));
}
