using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Trash;

[Collection<IntegrationCollection>]
public sealed class TrashEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Date = "2026-06-05";

    [Fact]
    public async Task A_new_user_has_an_empty_trash()
    {
        using var member = await CreateUserClientAsync();

        var trash = await TrashAsync(member);

        Assert.Empty(trash.Items);
        Assert.Equal(0, trash.Total);
    }

    [Fact]
    public async Task A_deleted_transaction_is_listed_and_comes_back()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var transaction = await CreateTransactionAsync(member, account, null, "expense", "12.30", Date, "Maistas");

        await member.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        var listed = await TrashAsync(member);
        var restore = await RestoreAsync(member, "transaction", transaction.Id);
        var back = await member.GetAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);

        var row = Assert.Single(listed.Items);
        Assert.Equal("transaction", row.Kind);
        Assert.Equal(transaction.Id, row.EntityId);
        Assert.Equal("Maistas, 12.30 EUR", row.Description);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        back.EnsureSuccessStatusCode();
        Assert.Empty((await TrashAsync(member)).Items);
    }

    [Fact]
    public async Task Restoring_twice_is_accepted_and_changes_nothing()
    {
        using var member = await CreateUserClientAsync();
        var goal = await PostAsync<IdDto>(
            member,
            "/api/goals",
            new { name = "Atostogos", targetAmount = "500.00", currentAmount = "10.00" });

        await member.DeleteAsync($"/api/goals/{goal.Id}", TestContext.Current.CancellationToken);
        var first = await RestoreAsync(member, "goal", goal.Id);
        var second = await RestoreAsync(member, "goal", goal.Id);
        var goals = (await member.GetFromJsonAsync<List<NamedRow>>("/api/goals", TestContext.Current.CancellationToken))!;

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Single(goals, g => g.Id == goal.Id);
    }

    [Fact]
    public async Task A_transfer_a_conversion_and_a_recurring_entry_come_back()
    {
        using var member = await CreateUserClientAsync();
        var from = await CreateAccountAsync("100.00", client: member);
        var to = await CreateAccountAsync("0.00", client: member);
        var transfer = await PostAsync<IdDto>(
            member,
            "/api/transfers",
            new { fromAccountId = from, toAccountId = to, amount = "25.00", date = Date, description = "Pervedimas" });
        var conversion = await PostAsync<IdDto>(
            member,
            "/api/conversions",
            new { accountId = from, fromAmount = "10.00", fromCurrency = "eur", toAmount = "11.00", toCurrency = "usd", date = Date });
        var bill = await PostAsync<IdDto>(
            member,
            "/api/recurring-bills",
            new { name = "Internetas", kind = "fixed", amount = "20.00", accountId = from, cadence = "monthly", nextDueDate = Date });

        await member.DeleteAsync($"/api/transfers/{transfer.Id}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/conversions/{conversion.Id}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/recurring-bills/{bill.Id}", TestContext.Current.CancellationToken);
        var listed = await TrashAsync(member);
        var restoredTransfer = await RestoreAsync(member, "transfer", transfer.Id);
        var restoredConversion = await RestoreAsync(member, "conversion", conversion.Id);
        var restoredBill = await RestoreAsync(member, "recurringBill", bill.Id);

        Assert.Equal(3, listed.Total);
        Assert.Equal(HttpStatusCode.NoContent, restoredTransfer.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, restoredConversion.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, restoredBill.StatusCode);
        Assert.Contains((await member.GetFromJsonAsync<PageDto<IdDto>>("/api/transfers", TestContext.Current.CancellationToken))!.Items, t => t.Id == transfer.Id);
        Assert.Contains((await member.GetFromJsonAsync<PageDto<IdDto>>("/api/conversions", TestContext.Current.CancellationToken))!.Items, c => c.Id == conversion.Id);
        Assert.Contains((await member.GetFromJsonAsync<List<NamedRow>>("/api/recurring-bills", TestContext.Current.CancellationToken))!, b => b.Id == bill.Id);
    }

    [Fact]
    public async Task A_budget_an_asset_and_a_debt_come_back()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var budget = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = category, limitAmount = "150.00" });
        var asset = await PostAsync<IdDto>(
            member,
            "/api/assets",
            new { name = "Butas", type = "property", currentValue = "1000.00", asOf = Date });
        var debt = await PostAsync<IdDto>(
            member,
            "/api/debts",
            new { name = "Paskola", type = "loan", outstandingAmount = "500.00", asOf = Date });

        await member.DeleteAsync($"/api/budgets/{budget.Id}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/assets/{asset.Id}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/debts/{debt.Id}", TestContext.Current.CancellationToken);
        var restoredBudget = await RestoreAsync(member, "budget", budget.Id);
        var restoredAsset = await RestoreAsync(member, "asset", asset.Id);
        var restoredDebt = await RestoreAsync(member, "debt", debt.Id);

        Assert.Equal(HttpStatusCode.NoContent, restoredBudget.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, restoredAsset.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, restoredDebt.StatusCode);
        Assert.Contains((await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets", TestContext.Current.CancellationToken))!, b => b.Id == budget.Id);
        Assert.Contains((await member.GetFromJsonAsync<List<NamedRow>>("/api/assets", TestContext.Current.CancellationToken))!, a => a.Id == asset.Id);
        Assert.Contains((await member.GetFromJsonAsync<List<NamedRow>>("/api/debts", TestContext.Current.CancellationToken))!, d => d.Id == debt.Id);
    }

    [Fact]
    public async Task A_restored_transaction_keeps_its_split_lines_and_its_tags()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var food = await CreateCategoryAsync(client: member);
        var travel = await CreateCategoryAsync(client: member);
        var tag = await CreateTagAsync("Atostogos", client: member);
        var transaction = await RecordTransactionAsync(
            member,
            new
            {
                accountId = account,
                type = "expense",
                amount = "30.00",
                date = Date,
                tagIds = new[] { tag },
                lines = new[]
                {
                    new { categoryId = food, amount = "20.00" },
                    new { categoryId = travel, amount = "10.00" },
                },
            });

        await member.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        await RestoreAsync(member, "transaction", transaction.Id);
        var back = (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken))!;

        Assert.True(back.IsSplit);
        Assert.Equal(["10.00", "20.00"], back.Lines!.Select(l => l.Amount).Order());
        Assert.Equal([tag], back.TagIds);
    }

    [Fact]
    public async Task A_transaction_whose_account_was_archived_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var transaction = await CreateTransactionAsync(member, account, null, "expense", "5.00", Date);

        await member.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/accounts/{account}", TestContext.Current.CancellationToken);
        var restore = await RestoreAsync(member, "transaction", transaction.Id);

        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "restore.referenceMissing");
    }

    [Fact]
    public async Task A_budget_whose_category_was_deleted_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var budget = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = category, limitAmount = "40.00" });

        await member.DeleteAsync($"/api/budgets/{budget.Id}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/categories/{category}", TestContext.Current.CancellationToken);
        var restore = await RestoreAsync(member, "budget", budget.Id);

        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "restore.referenceMissing");
    }

    [Fact]
    public async Task A_budget_whose_category_and_period_were_taken_again_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var budget = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = category, limitAmount = "40.00" });

        await member.DeleteAsync($"/api/budgets/{budget.Id}", TestContext.Current.CancellationToken);
        await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = category, limitAmount = "90.00" });
        var restore = await RestoreAsync(member, "budget", budget.Id);

        await AssertProblemAsync(restore, HttpStatusCode.Conflict, "restore.slotTaken");
    }

    [Fact]
    public async Task A_conversion_whose_fee_was_deleted_on_its_own_is_refused_until_the_fee_is_back()
    {
        using var member = await CreateUserClientAsync();
        var conversion = await CreateConversionWithFeeAsync(member);

        await member.DeleteAsync($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/conversions/{conversion.Id}", TestContext.Current.CancellationToken);
        var refused = await RestoreAsync(member, "conversion", conversion.Id);
        await RestoreAsync(member, "transaction", conversion.FeeTransactionId!.Value);
        var accepted = await RestoreAsync(member, "conversion", conversion.Id);

        await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "restore.companionDeleted");
        Assert.Equal(HttpStatusCode.NoContent, accepted.StatusCode);
    }

    [Fact]
    public async Task A_conversion_deleted_with_its_fee_brings_the_fee_back()
    {
        using var member = await CreateUserClientAsync();
        var conversion = await CreateConversionWithFeeAsync(member);

        await member.DeleteAsync($"/api/conversions/{conversion.Id}", TestContext.Current.CancellationToken);
        var listed = await TrashAsync(member);
        var gone = await member.GetAsync($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken);
        var restore = await RestoreAsync(member, "conversion", conversion.Id);
        var fee = await member.GetAsync($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken);

        var row = Assert.Single(listed.Items);
        Assert.Equal("conversion", row.Kind);
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        fee.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task A_transaction_without_its_split_lines_is_refused()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var transaction = await RecordTransactionAsync(
            member,
            new
            {
                accountId = account,
                type = "expense",
                amount = "9.00",
                date = Date,
                lines = new[] { new { categoryId = category, amount = "9.00" } },
            });

        await member.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        await ForgetLinesAsync(user.Id, transaction.Id);
        var restore = await RestoreAsync(member, "transaction", transaction.Id);

        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "restore.detailsLost");
    }

    [Fact]
    public async Task A_deletion_older_than_the_window_is_neither_listed_nor_restorable()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var goal = await PostAsync<IdDto>(
            member,
            "/api/goals",
            new { name = "Senas", targetAmount = "100.00", currentAmount = "0.00" });

        await member.DeleteAsync($"/api/goals/{goal.Id}", TestContext.Current.CancellationToken);
        await BackdateAsync(user.Id, goal.Id, TimeSpan.FromDays(40));
        var listed = await TrashAsync(member);
        var restore = await RestoreAsync(member, "goal", goal.Id);

        Assert.Empty(listed.Items);
        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "restore.expired");
    }

    [Fact]
    public async Task Another_user_neither_sees_nor_restores_your_deletion()
    {
        using var mine = await CreateUserClientAsync();
        using var theirs = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: mine);
        var transaction = await CreateTransactionAsync(mine, account, null, "expense", "7.00", Date);

        await mine.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        var theirTrash = await TrashAsync(theirs);
        var theirRestore = await RestoreAsync(theirs, "transaction", transaction.Id);

        Assert.Empty(theirTrash.Items);
        await AssertProblemAsync(theirRestore, HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task On_a_shared_account_the_trash_lists_only_your_own_deletions()
    {
        var other = await CreateUserAsync();
        var household = await CreateHouseholdAsync(other);
        var account = await CreateAccountAsync(householdId: household);
        using var housemate = await LoginAsync(other);
        var mine = await CreateTransactionAsync(Client, account, null, "expense", "3.00", Date, "Mano");
        var theirs = await CreateTransactionAsync(housemate, account, null, "expense", "4.00", Date, "Ju");

        await Client.DeleteAsync($"/api/transactions/{mine.Id}", TestContext.Current.CancellationToken);
        await housemate.DeleteAsync($"/api/transactions/{theirs.Id}", TestContext.Current.CancellationToken);
        var housemateTrash = await TrashAsync(housemate);
        var housemateRestoresMine = await RestoreAsync(housemate, "transaction", mine.Id);

        Assert.Single(housemateTrash.Items, row => row.EntityId == theirs.Id);
        Assert.DoesNotContain(housemateTrash.Items, row => row.EntityId == mine.Id);
        await AssertProblemAsync(housemateRestoresMine, HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task A_kind_whose_feature_is_switched_off_leaves_the_trash_and_cannot_be_restored()
    {
        using var member = await CreateUserClientAsync();
        var goal = await PostAsync<IdDto>(
            member,
            "/api/goals",
            new { name = "Isjungta", targetAmount = "100.00", currentAmount = "0.00" });
        await member.DeleteAsync($"/api/goals/{goal.Id}", TestContext.Current.CancellationToken);

        var settings = (await Client.GetFromJsonAsync<JsonNode>("/api/settings", TestContext.Current.CancellationToken))!;
        try
        {
            await SwitchGoalsAsync(settings, false);

            var listed = await TrashAsync(member);
            var restore = await RestoreAsync(member, "goal", goal.Id);

            Assert.DoesNotContain(listed.Items, row => row.EntityId == goal.Id);
            await AssertProblemAsync(restore, HttpStatusCode.NotFound, "feature.disabled");
        }
        finally
        {
            await SwitchGoalsAsync(settings, true);
        }

        Assert.Contains((await TrashAsync(member)).Items, row => row.EntityId == goal.Id);
    }

    [Fact]
    public async Task Restoring_something_that_was_never_deleted_answers_not_found()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var transaction = await CreateTransactionAsync(member, account, null, "expense", "2.00", Date);

        var restore = await RestoreAsync(member, "transaction", transaction.Id);

        await AssertProblemAsync(restore, HttpStatusCode.NotFound, "resource.notFound");
    }

    private async Task<ConversionRow> CreateConversionWithFeeAsync(HttpClient member)
    {
        var account = await CreateAccountAsync("100.00", client: member);
        var category = await CreateCategoryAsync(client: member);

        return await PostAsync<ConversionRow>(
            member,
            "/api/conversions",
            new
            {
                accountId = account,
                fromAmount = "10.00",
                fromCurrency = "eur",
                toAmount = "11.00",
                toCurrency = "usd",
                date = Date,
                feeAmount = "0.50",
                feeCurrency = "eur",
                feeCategoryId = category,
            });
    }

    private async Task SwitchGoalsAsync(JsonNode settings, bool enabled)
    {
        settings["features"]!["goals"] = enabled;
        var response = await Client.PutAsJsonAsync("/api/settings", settings);
        response.EnsureSuccessStatusCode();
    }

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, string kind, Guid entityId) =>
        client.PostAsJsonAsync("/api/trash/restore", new { kind, entityId });

    private static async Task<PageDto<TrashRow>> TrashAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash"))!;

    private async Task BackdateAsync(Guid userId, Guid entityId, TimeSpan age)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var entry = await db.DeletionEntries.FirstAsync(e => e.EntityId == entityId);
        entry.DeletedAt = DateTimeOffset.UtcNow - age;
        await db.SaveChangesAsync();
    }

    private async Task ForgetLinesAsync(Guid userId, Guid transactionId)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var typedId = new TransactionId(transactionId);
        await db.TransactionLines.Where(l => l.TransactionId == typedId).ExecuteDeleteAsync();
    }

    private static AppDbContext OpenAs(IServiceScope scope, Guid userId) => new(
        scope.ServiceProvider.GetRequiredService<DbContextOptions<AppDbContext>>(),
        new TestCurrentUser(userId));

    private sealed record TrashRow(Guid Id, string Kind, Guid EntityId, string Description, DateTimeOffset DeletedAt);

    private sealed record NamedRow(Guid Id, string Name);

    private sealed record ConversionRow(Guid Id, Guid AccountId, Guid? FeeTransactionId);
}
