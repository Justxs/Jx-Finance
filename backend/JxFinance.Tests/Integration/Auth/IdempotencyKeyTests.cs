using System.Net;
using System.Net.Http.Json;
using System.Text;
using JxFinance.Common.Middleware;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Auth;

[Collection<PeopleCollection>]
public sealed class IdempotencyKeyTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    private const string TransactionsPath = "/api/transactions";

    [Fact]
    public async Task A_retry_with_the_same_key_returns_the_first_answer_and_records_one_row()
    {
        await using var on = await ApiTokensOnAsync();
        using var writer = await WriterAsync();
        var body = Expense(writer.Account, "Coffee retried");

        var first = await PostAsync(writer.Script, body, "coffee-1");
        var second = await PostAsync(writer.Script, body, "coffee-1");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
        Assert.False(first.Headers.Contains(ApiIdempotencyKey.ReplayedHeaderName));
        Assert.Equal(["true"], second.Headers.GetValues(ApiIdempotencyKey.ReplayedHeaderName));
        Assert.Equal(first.Headers.Location, second.Headers.Location);
        var created = (await first.Content.ReadFromJsonAsync<TransactionDto>(TestContext.Current.CancellationToken))!;
        var replayed = (await second.Content.ReadFromJsonAsync<TransactionDto>(TestContext.Current.CancellationToken))!;
        Assert.Equal((created.Id, created.Amount, created.Description), (replayed.Id, replayed.Amount, replayed.Description));
        Assert.Equal(1, await CountAsync(writer.UserId, "Coffee retried"));
    }

    [Fact]
    public async Task The_same_key_with_another_body_or_another_active_household_is_refused()
    {
        await using var on = await ApiTokensOnAsync();
        using var writer = await WriterAsync();
        var household = await Seed.HouseholdAsync(writer.Browser);
        Assert.Equal(HttpStatusCode.Created, (await PostAsync(writer.Script, Expense(writer.Account, "Lunch"), "lunch-1")).StatusCode);

        var otherBody = await PostAsync(writer.Script, Expense(writer.Account, "Dinner"), "lunch-1");
        var otherHousehold = await PostAsync(writer.Script, Expense(writer.Account, "Lunch"), "lunch-1", household);

        await AssertProblemAsync(otherBody, HttpStatusCode.Conflict, "idempotency.keyReused");
        await AssertProblemAsync(otherHousehold, HttpStatusCode.Conflict, "idempotency.keyReused");
        Assert.Equal(1, await CountAsync(writer.UserId, "Lunch"));
        Assert.Equal(0, await CountAsync(writer.UserId, "Dinner"));
    }

    [Fact]
    public async Task A_duplicate_while_the_first_request_runs_answers_busy_and_an_abandoned_claim_is_taken_over()
    {
        await using var on = await ApiTokensOnAsync();
        using var writer = await WriterAsync();
        var body = Expense(writer.Account, "Parking");
        await ClaimAsync(writer.TokenId, "parking-1", body, DateTimeOffset.UtcNow);

        var busy = await PostAsync(writer.Script, body, "parking-1");

        await AssertProblemAsync(busy, HttpStatusCode.Conflict, "conflict.busy");
        Assert.Equal(0, await CountAsync(writer.UserId, "Parking"));

        await WithDbAsync(db => db.ApiIdempotencyKeys.Where(k => k.TokenId == writer.TokenId && k.Key == "parking-1")
            .ExecuteUpdateAsync(s => s.SetProperty(k => k.CreatedAt, DateTimeOffset.UtcNow.AddSeconds(-61)), TestContext.Current.CancellationToken));
        var taken = await PostAsync(writer.Script, body, "parking-1");
        var replayed = await PostAsync(writer.Script, body, "parking-1");

        Assert.Equal(HttpStatusCode.Created, taken.StatusCode);
        Assert.Equal(HttpStatusCode.Created, replayed.StatusCode);
        Assert.True(replayed.Headers.Contains(ApiIdempotencyKey.ReplayedHeaderName));
        Assert.Equal(1, await CountAsync(writer.UserId, "Parking"));
        var stored = await WithDbAsync(db => db.ApiIdempotencyKeys.SingleAsync(k => k.TokenId == writer.TokenId && k.Key == "parking-1", TestContext.Current.CancellationToken));
        Assert.Equal(201, stored.StatusCode);
        Assert.NotNull(stored.Body);
        Assert.StartsWith(TransactionsPath + "/", stored.Location, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_server_error_is_not_remembered_so_the_retry_runs_again()
    {
        await using var on = await ApiTokensOnAsync();
        using var writer = await WriterAsync();
        const string marker = "Refused by the idempotency test";
        await WithDbAsync(db => db.Database.ExecuteSqlRawAsync(
            """
            CREATE FUNCTION jx_test_refuse_insert() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF NEW."Description" = 'Refused by the idempotency test' THEN RAISE EXCEPTION 'refused by the test'; END IF;
                RETURN NEW;
            END $$;
            CREATE TRIGGER jx_test_refuse_insert BEFORE INSERT ON "Transactions" FOR EACH ROW EXECUTE FUNCTION jx_test_refuse_insert();
            """,
            TestContext.Current.CancellationToken));

        HttpResponseMessage failed;
        try
        {
            failed = await PostAsync(writer.Script, Expense(writer.Account, marker), "fails-once");
        }
        finally
        {
            await WithDbAsync(db => db.Database.ExecuteSqlRawAsync(
                """DROP TRIGGER jx_test_refuse_insert ON "Transactions"; DROP FUNCTION jx_test_refuse_insert();""",
                TestContext.Current.CancellationToken));
        }

        Assert.Equal(HttpStatusCode.InternalServerError, failed.StatusCode);
        Assert.False(await WithDbAsync(db => db.ApiIdempotencyKeys.AnyAsync(k => k.TokenId == writer.TokenId, TestContext.Current.CancellationToken)));

        var retried = await PostAsync(writer.Script, Expense(writer.Account, marker), "fails-once");

        Assert.Equal(HttpStatusCode.Created, retried.StatusCode);
        Assert.False(retried.Headers.Contains(ApiIdempotencyKey.ReplayedHeaderName));
        Assert.Equal(1, await CountAsync(writer.UserId, marker));
    }

    [Fact]
    public async Task Keys_belong_to_one_token()
    {
        await using var on = await ApiTokensOnAsync();
        using var writer = await WriterAsync();
        using var second = TokenClient((await IssueTokenAsync(writer.UserId, access: TokenAccess.ReadWrite)).Token);
        var body = Expense(writer.Account, "Bakery");

        var first = await PostAsync(writer.Script, body, "shared-key");
        var other = await PostAsync(second, body, "shared-key");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, other.StatusCode);
        Assert.False(other.Headers.Contains(ApiIdempotencyKey.ReplayedHeaderName));
        Assert.Equal(2, await CountAsync(writer.UserId, "Bakery"));
    }

    [Fact]
    public async Task A_malformed_key_is_refused_and_a_browser_request_ignores_the_header()
    {
        await using var on = await ApiTokensOnAsync();
        using var writer = await WriterAsync();
        var body = Expense(writer.Account, "Malformed");

        await AssertProblemAsync(await PostAsync(writer.Script, body, new string('k', 65)), HttpStatusCode.BadRequest, "text.tooLong");
        await AssertProblemAsync(await PostAsync(writer.Script, body, "two words"), HttpStatusCode.BadRequest, "text.invalidFormat");
        Assert.Equal(HttpStatusCode.Created, (await PostAsync(writer.Browser, body, "browser-1")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await PostAsync(writer.Browser, body, "browser-1")).StatusCode);

        Assert.Equal(2, await CountAsync(writer.UserId, "Malformed"));
        Assert.False(await WithDbAsync(db => db.ApiIdempotencyKeys.AnyAsync(k => k.TokenId == writer.TokenId, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task The_retention_job_removes_keys_older_than_a_day()
    {
        var user = await CreateUserAsync();
        var (tokenId, _) = await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite);
        var body = Expense(Guid.NewGuid(), "Old");
        var now = DateTimeOffset.UtcNow;
        await ClaimAsync(tokenId, "day-old", body, now.AddHours(-25));
        await ClaimAsync(tokenId, "fresh", body, now.AddHours(-23));

        await WithDbAsync(db => Retention.PruneIdempotencyKeysAsync(db, now, TestContext.Current.CancellationToken));

        var kept = await WithDbAsync(db => db.ApiIdempotencyKeys.Where(k => k.TokenId == tokenId).Select(k => k.Key).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(["fresh"], kept);
    }

    private async Task<Writer> WriterAsync()
    {
        var user = await CreateUserAsync();
        var browser = await LoginAsync(user);
        var account = await CreateAccountAsync("100.00", client: browser);
        var (tokenId, token) = await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite);
        return new Writer(user.Id, tokenId, browser, TokenClient(token), account);
    }

    private static string Expense(Guid accountId, string description) =>
        $$"""{"accountId":"{{accountId}}","type":"expense","amount":"4.20","date":"2026-09-01","description":"{{description}}"}""";

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, string body, string key, Guid? household = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, TransactionsPath)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.TryAddWithoutValidation(ApiIdempotencyKey.HeaderName, key);
        if (household is { } active)
        {
            request.Headers.Add(ActiveHousehold.HeaderName, active.ToString());
        }

        return client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private Task ClaimAsync(Guid tokenId, string key, string body, DateTimeOffset createdAt) =>
        WithDbAsync(async db =>
        {
            db.ApiIdempotencyKeys.Add(new ApiIdempotencyKey
            {
                TokenId = tokenId,
                Key = key,
                RequestHash = IdempotencyMiddleware.RequestHash("POST", TransactionsPath, "", "", Encoding.UTF8.GetBytes(body)),
                CreatedAt = createdAt,
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

    private Task<int> CountAsync(Guid userId, string description) =>
        WithDbAsync(userId, db => db.Transactions.CountAsync(t => t.Description == description, TestContext.Current.CancellationToken));

    private sealed record Writer(Guid UserId, Guid TokenId, HttpClient Browser, HttpClient Script, Guid Account) : IDisposable
    {
        public void Dispose()
        {
            Browser.Dispose();
            Script.Dispose();
        }
    }
}
