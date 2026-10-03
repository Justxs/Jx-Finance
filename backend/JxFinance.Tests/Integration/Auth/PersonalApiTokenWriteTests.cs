using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Auth;

[Collection<PeopleCollection>]
public sealed class PersonalApiTokenWriteTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    private const string StatementCsv =
        "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n"
        + "\"LT476300010172306416\",\"10\",\"2026-05-01\",\"\",\"Likutis pradziai\",\"100.00\",\"EUR\",\"K\",\"\"\n"
        + "\"LT476300010172306416\",\"20\",\"2026-05-05\",\"MAXIMA\",\"PIRKINYS MAXIMA\",\"12.40\",\"EUR\",\"D\",\"APIREF-{0}\"\n";

    [Fact]
    public async Task A_read_token_is_refused_a_write_and_told_to_create_a_read_and_write_token()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync(client: browser);
        using var script = TokenClient((await IssueTokenAsync(user.Id)).Token);

        var response = await script.PostAsJsonAsync("/api/transactions", Expense(account, "12.40", "2026-09-01"), TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "token.notAllowed");
        Assert.Contains("read-and-write token", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
        Assert.Empty((await browser.GetFromJsonAsync<PageDto<TransactionDto>>("/api/transactions", TestContext.Current.CancellationToken))!.Items);
    }

    [Fact]
    public async Task A_read_and_write_token_records_edits_categorizes_tags_and_deletes_transactions()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync("100.00", client: browser);
        var category = await CreateCategoryAsync(client: browser);
        var tag = await CreateTagAsync(client: browser);
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);

        var created = await ReadCreatedAsync<TransactionDto>(
            await script.PostAsJsonAsync("/api/transactions", Expense(account, "12.40", "2026-09-01", "Maxima"), TestContext.Current.CancellationToken));
        Assert.Equal("api", created.Source);

        var edited = await ReadOkAsync<TransactionDto>(await script.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            Expense(account, "13.10", "2026-09-01", "Maxima"),
            TestContext.Current.CancellationToken));
        Assert.Equal(("13.10", "api"), (edited.Amount, edited.Source));

        var categorized = await ReadOkAsync<BulkDto>(await script.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { created.Id }, categoryId = category },
            TestContext.Current.CancellationToken));
        Assert.Equal(1, categorized.Updated);
        var tagged = await ReadOkAsync<BulkDto>(await script.PostAsJsonAsync(
            "/api/transactions/bulk-tags",
            new { transactionIds = new[] { created.Id }, tagIds = new[] { tag } },
            TestContext.Current.CancellationToken));
        Assert.Equal(1, tagged.Updated);
        var stored = (await browser.GetFromJsonAsync<TransactionDto>($"/api/transactions/{created.Id}", TestContext.Current.CancellationToken))!;
        Assert.Equal(category, stored.CategoryId);
        Assert.Equal([tag], stored.TagIds);

        Assert.Equal(HttpStatusCode.NoContent, (await script.DeleteAsync($"/api/transactions/{created.Id}", TestContext.Current.CancellationToken)).StatusCode);

        var trash = (await browser.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash", TestContext.Current.CancellationToken))!;
        Assert.Contains(trash.Items, row => row.Kind == "transaction" && row.EntityId == created.Id);
        Assert.Equal("100.00", await CurrentBalanceAsync(account, browser));
    }

    [Fact]
    public async Task A_read_and_write_token_records_edits_and_deletes_a_transfer()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var from = await CreateAccountAsync("100.00", client: browser);
        var to = await CreateAccountAsync(client: browser);
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);

        var transfer = await ReadCreatedAsync<TransferDto>(await script.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = from, toAccountId = to, amount = "20.00", date = "2026-09-01" },
            TestContext.Current.CancellationToken));
        var edited = await ReadOkAsync<TransferDto>(await script.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = from, toAccountId = to, amount = "25.00", date = "2026-09-01" },
            TestContext.Current.CancellationToken));

        Assert.Equal("25.00", edited.Amount);
        Assert.Equal("25.00", await CurrentBalanceAsync(to, browser));
        Assert.Equal(HttpStatusCode.NoContent, (await script.DeleteAsync($"/api/transfers/{transfer.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal("100.00", await CurrentBalanceAsync(from, browser));
    }

    [Fact]
    public async Task A_read_and_write_token_is_refused_structure_files_and_imports()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync(client: browser);
        var transaction = await CreateTransactionAsync(browser, account, null, "expense", "5.00", "2026-09-01");
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);
        using var file = new MultipartFormDataContent { { new ByteArrayContent([0x25, 0x50, 0x44, 0x46]), "file", "receipt.pdf" } };

        var refused = new[]
        {
            await script.PostAsJsonAsync("/api/categories", new { name = "From a script", type = "expense" }, TestContext.Current.CancellationToken),
            await script.PostAsync($"/api/transactions/{transaction.Id}/attachments", file, TestContext.Current.CancellationToken),
            await script.PostAsJsonAsync("/api/import/confirm", new { accountId = account, rows = Array.Empty<object>() }, TestContext.Current.CancellationToken),
            await script.PostAsJsonAsync("/api/budgets", new { }, TestContext.Current.CancellationToken),
            await script.DeleteAsync($"/api/accounts/{account}", TestContext.Current.CancellationToken),
        };

        foreach (var response in refused)
        {
            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "token.notAllowed");
            Assert.Contains("needs a browser session", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task A_write_under_an_active_household_cannot_name_an_account_outside_it()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var first = await Seed.HouseholdAsync(browser);
        var second = await Seed.HouseholdAsync(browser);
        var outside = await CreateAccountAsync(householdId: second, client: browser);
        var inside = await CreateAccountAsync(householdId: first, client: browser);
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);

        var refused = await SendScopedAsync(script, HttpMethod.Post, "/api/transactions", first, Expense(outside, "5.00", "2026-09-01"));
        var accepted = await SendScopedAsync(script, HttpMethod.Post, "/api/transactions", first, Expense(inside, "5.00", "2026-09-01"));

        await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "reference.notFound");
        Assert.Equal(HttpStatusCode.Created, accepted.StatusCode);
    }

    [Fact]
    public async Task A_write_on_a_shared_account_names_the_token_in_the_household_activity()
    {
        await using var on = await ApiTokensOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var category = (await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/categories",
            new { name = $"Category {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = pair.HouseholdId })).Id;
        using var script = TokenClient((await IssueTokenAsync(pair.Owner.Id, access: TokenAccess.ReadWrite, name: "Home Assistant")).Token);

        var first = await ReadCreatedAsync<TransactionDto>(
            await script.PostAsJsonAsync("/api/transactions", Expense(shared, "12.40", "2026-09-01", "Maxima"), TestContext.Current.CancellationToken));
        var second = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "3.00", "2026-09-02", "Typed in the browser");
        (await script.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { first.Id, second.Id }, categoryId = category },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var events = (await pair.PartnerClient.GetFromJsonAsync<PageDto<AuditDto>>(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken))!.Items.Where(e => e.EntityKind == "transaction").ToList();

        var created = Assert.Single(events, e => e.Action == "created" && e.EntityId == first.Id);
        Assert.Equal("Home Assistant", created.ViaToken);
        var typed = Assert.Single(events, e => e.Action == "created" && e.EntityId == second.Id);
        Assert.Null(typed.ViaToken);
        var bulk = Assert.Single(events, e => e.Action == "updated" && e.Count == 2);
        Assert.Equal("Home Assistant", bulk.ViaToken);
    }

    [Fact]
    public async Task A_bank_import_links_an_api_created_row_instead_of_importing_it_again()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync("100.00", client: browser);
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);
        var entered = await ReadCreatedAsync<TransactionDto>(
            await script.PostAsJsonAsync("/api/transactions", Expense(account, "12.40", "2026-05-03", "Coffee"), TestContext.Current.CancellationToken));
        var csv = string.Format(StatementCsv, Guid.NewGuid().ToString("N")[..8]);

        var preview = await ReadOkAsync<PreviewDto>(await UploadCsvAsync(browser, account, csv));
        var row = Assert.Single(preview.Rows);
        Assert.Equal(entered.Id, row.MatchedTransaction?.Id);

        var confirmed = await PostAsync<ConfirmDto>(browser, "/api/import/confirm", new
        {
            accountId = account,
            rows = new[] { new { row.ImportRef, row.Amount, row.Type, row.Date, row.Description, existingTransactionId = entered.Id } },
        });

        Assert.Equal(new ConfirmDto(0, 0, 1), confirmed);
        Assert.Equal("87.60", await CurrentBalanceAsync(account, browser));
        var linked = (await browser.GetFromJsonAsync<TransactionDto>($"/api/transactions/{entered.Id}", TestContext.Current.CancellationToken))!;
        Assert.Equal(("imported", "Coffee"), (linked.Source, linked.Description));
    }

    [Fact]
    public async Task Confirming_a_recurring_entry_that_pays_a_debt_through_a_token_links_the_payment()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync("5000.00", client: browser);
        var debt = (await PostAsync<IdDto>(
            browser,
            "/api/debts",
            new { name = "Mortgage", type = "mortgage", outstandingAmount = "1000.00", asOf = "2026-05-01", tracksPayments = true })).Id;
        var bill = (await PostAsync<IdDto>(
            browser,
            "/api/recurring-bills",
            new { name = "Loan payment", shape = "expense", kind = "fixed", amount = "200.00", accountId = account, cadence = "monthly", nextDueDate = "2026-06-01", remindDaysBefore = 3, debtId = debt })).Id;
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);

        var confirmed = await script.PostAsJsonAsync($"/api/recurring-bills/{bill}/confirm", new { expectedDueDate = "2026-06-01" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);
        var payment = Assert.Single((await browser.GetFromJsonAsync<List<PaymentDto>>($"/api/debts/{debt}/payments", TestContext.Current.CancellationToken))!);
        Assert.Equal(("200.00", "regular", "800.00"), (payment.Amount, payment.Kind, payment.Balance));
    }

    [Fact]
    public async Task A_read_and_write_token_lives_at_most_ninety_days()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);

        var tooLong = await CreateAsync(browser, user.Password, "Home Assistant", 365, "readWrite");
        await AssertProblemAsync(tooLong, HttpStatusCode.BadRequest, "range.invalid");
        await AssertValidationErrorAsync(tooLong, "expiresInDays");
        await AssertValidationErrorAsync(await CreateAsync(browser, user.Password, "Script", 90, "everything"), "access");

        Assert.Equal(HttpStatusCode.Created, (await CreateAsync(browser, user.Password, "Home Assistant", 90, "readWrite")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await CreateAsync(browser, user.Password, "Spreadsheet", 365, "read")).StatusCode);
        var listed = (await browser.GetFromJsonAsync<List<TokenDto>>("/api/auth/tokens", TestContext.Current.CancellationToken))!;
        Assert.Equal(
            [("Home Assistant", "readWrite"), ("Spreadsheet", "read")],
            listed.Select(t => (t.Name, t.Access)).Order());
        var stored = await WithDbAsync(db => db.PersonalApiTokens.Where(t => t.UserId == user.Id).Select(t => t.Access).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal([TokenAccess.Read, TokenAccess.ReadWrite], stored.Order());
    }

    [Fact]
    public async Task Deactivation_a_password_reset_and_the_recovery_command_delete_write_tokens()
    {
        await using var on = await ApiTokensOnAsync();
        var deactivated = await CreateUserAsync();
        var reset = await CreateUserAsync();
        var admin = await CreateUserAsync("Admin");
        foreach (var user in new[] { deactivated, reset, admin })
        {
            await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite);
        }

        (await Client.PostAsync($"/api/users/{deactivated.Id}/deactivate", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.PostAsJsonAsync(
            $"/api/users/{reset.Id}/reset-password",
            new { newPassword = reset.Password, currentPassword = ApiFixture.TestAdminPassword, resetTwoFactor = false },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await using (var scope = Services.CreateAsyncScope())
        {
            var account = (await scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>().FindByIdAsync(admin.Id.ToString()))!;
            await RecoveryCommand.RecoverAsync(scope.ServiceProvider, account, "Temporary-Password-456!");
        }

        foreach (var user in new[] { deactivated, reset, admin })
        {
            Assert.Equal(0, await WithDbAsync(db => db.PersonalApiTokens.CountAsync(t => t.UserId == user.Id, TestContext.Current.CancellationToken)));
        }
    }

    private static object Expense(Guid accountId, string amount, string date, string? description = null) =>
        new { accountId, type = "expense", amount, date, description };

    private static Task<HttpResponseMessage> CreateAsync(HttpClient client, string password, string name, int expiresInDays, string access) =>
        client.PostAsJsonAsync("/api/auth/tokens", new { name, expiresInDays, password, access }, TestContext.Current.CancellationToken);

    private static async Task<T> ReadCreatedAsync<T>(HttpResponseMessage response)
    {
        Assert.True(
            response.StatusCode == HttpStatusCode.Created,
            $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)}");
        return (await response.Content.ReadFromJsonAsync<T>(TestContext.Current.CancellationToken))!;
    }

    private sealed record AuditDto(Guid Id, string? ViaToken, string Action, string EntityKind, Guid? EntityId, int? Count);

    private sealed record PreviewRowDto(string ImportRef, DateOnly Date, string? Description, string Amount, string Type, MatchedDto? MatchedTransaction);

    private sealed record MatchedDto(Guid Id);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);

    private sealed record ConfirmDto(int Imported, int SkippedDuplicates, int Linked);

    private sealed record PaymentDto(Guid Id, string Amount, string Kind, string Balance);

    private sealed record TokenDto(Guid Id, string Name, string Access);
}
