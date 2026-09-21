using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Trash;

[Collection<IntegrationCollection>]
public sealed class RecordedChangesTrashTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Date = "2026-06-05";

    [Fact]
    public async Task A_deleted_category_comes_back_with_its_transactions_lines_entries_and_budget()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync(client: member);
        var food = await CreateNamedCategoryAsync(member, "Groceries");
        var other = await CreateCategoryAsync(client: member);
        var plain = await CreateTransactionAsync(member, account, food, "expense", "12.00", Date, "Maxima");
        var split = await RecordTransactionAsync(
            member,
            new
            {
                accountId = account,
                type = "expense",
                amount = "30.00",
                date = Date,
                lines = new[]
                {
                    new { categoryId = food, amount = "20.00" },
                    new { categoryId = other, amount = "10.00" },
                },
            });
        await PostAsync<IdDto>(
            member,
            "/api/recurring-bills",
            new
            {
                name = "Maisto dėžė",
                shape = "expense",
                kind = "fixed",
                amount = "40.00",
                categoryId = food,
                accountId = account,
                cadence = "monthly",
                nextDueDate = Date,
                remindDaysBefore = 3,
            });
        var budget = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = food, limitAmount = "300.00" });
        var before = await CategoryStateAsync(user.Id, food);

        var deleted = await member.DeleteAsync($"/api/categories/{food}");
        var cleared = await CategoryStateAsync(user.Id, food);
        var listed = await TrashAsync(member);
        var restore = await RestoreAsync(member, "category", food);
        var after = await CategoryStateAsync(user.Id, food);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(0, cleared.Transactions + cleared.Lines + cleared.Bills + cleared.LiveBudgets);
        var row = Assert.Single(listed.Items);
        Assert.Equal("category", row.Kind);
        Assert.Equal("Groceries, 2 transactions, 1 recurring entry, 1 budget", row.Description);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal(before, after);
        Assert.Equal(new CategoryState(false, 1, 1, 1, 1), after);
        Assert.Contains((await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets"))!, b => b.Id == budget.Id);
        Assert.Equal(food, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{plain.Id}"))!.CategoryId);
        var lines = (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{split.Id}"))!.Lines!;
        Assert.Contains(lines, l => l.CategoryId == food && l.Amount == "20.00");
    }

    [Fact]
    public async Task A_transaction_given_another_category_since_keeps_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var food = await CreateCategoryAsync(client: member);
        var travel = await CreateCategoryAsync(client: member);
        var untouched = await CreateTransactionAsync(member, account, food, "expense", "5.00", Date);
        var moved = await CreateTransactionAsync(member, account, food, "expense", "6.00", Date);

        await member.DeleteAsync($"/api/categories/{food}");
        (await member.PutAsJsonAsync(
            $"/api/transactions/{moved.Id}",
            new { accountId = account, categoryId = travel, type = "expense", amount = "6.00", date = Date })).EnsureSuccessStatusCode();
        var restore = await RestoreAsync(member, "category", food);

        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal(food, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{untouched.Id}"))!.CategoryId);
        Assert.Equal(travel, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{moved.Id}"))!.CategoryId);
    }

    [Fact]
    public async Task A_budget_whose_slot_is_taken_stays_deleted_while_the_category_comes_back()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var category = await CreateCategoryAsync(client: member);
        var budget = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = category, limitAmount = "80.00" });

        await member.DeleteAsync($"/api/categories/{category}");
        await OccupyBudgetSlotAsync(user.Id, category);
        var restore = await RestoreAsync(member, "category", category);

        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Contains((await member.GetFromJsonAsync<List<NamedRow>>("/api/categories"))!, c => c.Id == category);
        Assert.DoesNotContain((await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets"))!, b => b.Id == budget.Id);
    }

    [Fact]
    public async Task A_budget_deleted_before_its_category_is_restored_after_the_category()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var older = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = category, limitAmount = "80.00" });
        await member.DeleteAsync($"/api/budgets/{older.Id}");

        await member.DeleteAsync($"/api/categories/{category}");
        var refused = await RestoreAsync(member, "budget", older.Id);
        var categoryBack = await RestoreAsync(member, "category", category);
        var accepted = await RestoreAsync(member, "budget", older.Id);

        await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "restore.referenceMissing");
        Assert.Equal(HttpStatusCode.NoContent, categoryBack.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, accepted.StatusCode);
    }

    [Fact]
    public async Task The_budget_of_a_housemate_who_left_stays_deleted()
    {
        var owner = await CreateUserAsync();
        var housemate = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var housemateClient = await LoginAsync(housemate);
        var household = await CreateOwnHouseholdAsync(ownerClient, housemate);
        var shared = await PostAsync<IdDto>(
            ownerClient,
            "/api/categories",
            new { name = "Bendra", type = "expense", scope = "shared", householdId = household });
        var ownerBudget = await PostAsync<IdDto>(ownerClient, "/api/budgets", new { categoryId = shared.Id, limitAmount = "50.00" });
        var housemateBudget = await PostAsync<IdDto>(housemateClient, "/api/budgets", new { categoryId = shared.Id, limitAmount = "60.00" });

        await ownerClient.DeleteAsync($"/api/categories/{shared.Id}");
        (await ownerClient.DeleteAsync($"/api/households/{household}/members/{housemate.Id}")).EnsureSuccessStatusCode();
        var restore = await RestoreAsync(ownerClient, "category", shared.Id);

        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.False(await BudgetDeletedAsync(owner.Id, ownerBudget.Id));
        Assert.True(await BudgetDeletedAsync(owner.Id, housemateBudget.Id));
    }

    [Fact]
    public async Task Restoring_a_category_twice_changes_nothing_and_nobody_else_can()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var transaction = await CreateTransactionAsync(member, account, category, "expense", "3.00", Date);

        await member.DeleteAsync($"/api/categories/{category}");
        var theirs = await RestoreAsync(stranger, "category", category);
        var first = await RestoreAsync(member, "category", category);
        var once = await CategoryStateAsync(user.Id, category);
        var second = await RestoreAsync(member, "category", category);

        await AssertProblemAsync(theirs, HttpStatusCode.NotFound, "resource.notFound");
        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Equal(once, await CategoryStateAsync(user.Id, category));
        Assert.Equal(category, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction.Id}"))!.CategoryId);
    }

    [Fact]
    public async Task A_deleted_tag_comes_back_on_every_transaction_it_was_on()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync(client: member);
        var tag = await CreateTagAsync("Atostogos", client: member);
        var kept = await TaggedTransactionAsync(member, account, tag);
        var deletedEarlier = await TaggedTransactionAsync(member, account, tag);
        await member.DeleteAsync($"/api/transactions/{deletedEarlier}");
        var before = await TagLinksAsync(user.Id, tag);

        await member.DeleteAsync($"/api/tags/{tag}");
        var cleared = await TagLinksAsync(user.Id, tag);
        var listed = await TrashAsync(member);
        var restore = await RestoreAsync(member, "tag", tag);
        var again = await RestoreAsync(member, "tag", tag);

        Assert.Empty(cleared);
        var row = Assert.Single(listed.Items, r => r.Kind == "tag");
        Assert.Equal("Atostogos, 1 transaction", row.Description);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal(before, await TagLinksAsync(user.Id, tag));
        Assert.Equal([tag], (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{kept}"))!.TagIds);
    }

    [Fact]
    public async Task A_tag_link_to_a_transaction_that_is_gone_is_not_restored()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync(client: member);
        var tag = await CreateTagAsync(client: member);
        var kept = await TaggedTransactionAsync(member, account, tag);
        var erased = await TaggedTransactionAsync(member, account, tag);

        await member.DeleteAsync($"/api/tags/{tag}");
        await EraseTransactionAsync(user.Id, erased);
        var restore = await RestoreAsync(member, "tag", tag);

        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal([kept], await TagLinksAsync(user.Id, tag));
    }

    [Fact]
    public async Task A_tag_whose_name_was_taken_again_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var tag = await CreateTagAsync("Kelionės", client: member);

        await member.DeleteAsync($"/api/tags/{tag}");
        await CreateTagAsync("kelionės", client: member);
        var restore = await RestoreAsync(member, "tag", tag);

        await AssertProblemAsync(restore, HttpStatusCode.Conflict, "restore.nameTaken");
        Assert.DoesNotContain((await member.GetFromJsonAsync<List<NamedRow>>("/api/tags"))!, t => t.Id == tag);
    }

    [Fact]
    public async Task A_deleted_rule_comes_back_in_its_place_with_its_tags()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var first = await CreateTagAsync(client: member);
        var second = await CreateTagAsync(client: member);
        var a = await CreateRuleAsync(member, "Pirma", category, []);
        var b = await CreateRuleAsync(member, "Antra", category, [first, second]);
        var c = await CreateRuleAsync(member, "Trečia", category, []);

        await member.DeleteAsync($"/api/categorization-rules/{b}");
        var listed = await TrashAsync(member);
        var restore = await RestoreAsync(member, "categorizationRule", b);
        var again = await RestoreAsync(member, "categorizationRule", b);
        var rules = await RulesAsync(member);

        Assert.Equal("Antra, 2 tags", Assert.Single(listed.Items).Description);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal([a, b, c], rules.Select(r => r.Id));
        Assert.Equal([0, 1, 2], rules.Select(r => r.Position));
        Assert.Equal(new[] { first, second }.Order(), rules[1].TagIds.Order());
    }

    [Fact]
    public async Task A_rule_whose_old_position_is_past_the_end_goes_last()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var a = await CreateRuleAsync(member, "A", category, []);
        var b = await CreateRuleAsync(member, "B", category, []);
        var c = await CreateRuleAsync(member, "C", category, []);

        await member.DeleteAsync($"/api/categorization-rules/{c}");
        await member.DeleteAsync($"/api/categorization-rules/{a}");
        await RestoreAsync(member, "categorizationRule", c);
        var rules = await RulesAsync(member);

        Assert.Equal([b, c], rules.Select(r => r.Id));
        Assert.Equal([0, 1], rules.Select(r => r.Position));
    }

    [Fact]
    public async Task A_rule_is_refused_when_the_rule_limit_is_reached()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var category = await CreateCategoryAsync(client: member);
        var rule = await CreateRuleAsync(member, "Paskutinė", category, []);

        await member.DeleteAsync($"/api/categorization-rules/{rule}");
        await FillRulesAsync(user.Id, category, 100);
        var restore = await RestoreAsync(member, "categorizationRule", rule);

        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "collection.invalidSize");
    }

    [Fact]
    public async Task A_deleted_household_shares_everything_again_for_every_member()
    {
        var owner = await CreateUserAsync();
        var housemate = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var housemateClient = await LoginAsync(housemate);
        var household = await CreateOwnHouseholdAsync(ownerClient, housemate, "Šeima");
        var ownerAccount = await CreateAccountAsync(householdId: household, client: ownerClient);
        var housemateAccount = await CreateAccountAsync(householdId: household, client: housemateClient);
        var category = await PostAsync<IdDto>(
            ownerClient,
            "/api/categories",
            new { name = "Namai", type = "expense", scope = "shared", householdId = household });
        var tag = await CreateTagAsync(householdId: household, client: housemateClient);
        var before = await SharingAsync(owner.Id, household);

        var deleted = await ownerClient.DeleteAsync($"/api/households/{household}");
        var cleared = await SharingAsync(owner.Id, household);
        var listed = await TrashAsync(ownerClient);
        var restore = await RestoreAsync(ownerClient, "household", household);
        var again = await RestoreAsync(ownerClient, "household", household);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty(cleared);
        Assert.Equal("Šeima, 2 accounts, 1 category, 1 tag", Assert.Single(listed.Items).Description);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal(before, await SharingAsync(owner.Id, household));
        Assert.Equal(
            new[] { ownerAccount, housemateAccount, category.Id, tag }.Order(),
            (await SharingAsync(owner.Id, household)).Order());
        Assert.Contains((await housemateClient.GetFromJsonAsync<List<NamedRow>>("/api/households"))!, h => h.Id == household);
        Assert.Equal(household, (await housemateClient.GetFromJsonAsync<AccountDto>($"/api/accounts/{ownerAccount}"))!.HouseholdId);
    }

    [Fact]
    public async Task A_household_restore_leaves_what_moved_elsewhere_and_reshares_what_was_archived()
    {
        var owner = await CreateUserAsync();
        var housemate = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var housemateClient = await LoginAsync(housemate);
        var household = await CreateOwnHouseholdAsync(ownerClient, housemate);
        var archived = await CreateAccountAsync(householdId: household, client: ownerClient);
        var moved = await CreateAccountAsync(householdId: household, client: housemateClient);

        await ownerClient.DeleteAsync($"/api/households/{household}");
        await ownerClient.DeleteAsync($"/api/accounts/{archived}");
        var elsewhere = await CreateOwnHouseholdAsync(housemateClient);
        (await housemateClient.PutAsJsonAsync(
            $"/api/accounts/{moved}",
            new { name = "Kitur", type = "checking", startingBalance = "0.00", scope = "shared", householdId = elsewhere })).EnsureSuccessStatusCode();
        var restore = await RestoreAsync(ownerClient, "household", household);
        var sharing = await SharingAsync(owner.Id, household);

        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal([archived], sharing);
        Assert.Equal(elsewhere, (await housemateClient.GetFromJsonAsync<AccountDto>($"/api/accounts/{moved}"))!.HouseholdId);
    }

    [Fact]
    public async Task Only_the_owner_who_deleted_a_household_can_restore_it()
    {
        var owner = await CreateUserAsync();
        var housemate = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var housemateClient = await LoginAsync(housemate);
        var household = await CreateOwnHouseholdAsync(ownerClient, housemate);

        await ownerClient.DeleteAsync($"/api/households/{household}");
        var byHousemate = await RestoreAsync(housemateClient, "household", household);
        await DemoteAsync(owner.Id, household);
        var byDemotedOwner = await RestoreAsync(ownerClient, "household", household);

        await AssertProblemAsync(byHousemate, HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(byDemotedOwner, HttpStatusCode.Forbidden, "access.forbidden");
    }

    [Fact]
    public async Task A_deleted_household_named_as_active_does_not_narrow_anything()
    {
        using var ownerClient = await CreateUserClientAsync();
        var deleted = await CreateOwnHouseholdAsync(ownerClient);
        var kept = await CreateOwnHouseholdAsync(ownerClient);
        var keptCategory = await PostAsync<IdDto>(
            ownerClient,
            "/api/categories",
            new { name = "Kita šeima", type = "expense", scope = "shared", householdId = kept });

        await ownerClient.DeleteAsync($"/api/households/{deleted}");
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/categories");
        request.Headers.Add("X-Active-Household", deleted.ToString());
        var response = await ownerClient.SendAsync(request);
        var categories = (await response.Content.ReadFromJsonAsync<List<NamedRow>>())!;

        Assert.Contains(categories, c => c.Id == keptCategory.Id);
    }

    private static async Task<Guid> CreateNamedCategoryAsync(HttpClient client, string name) =>
        (await PostAsync<IdDto>(client, "/api/categories", new { name, type = "expense" })).Id;

    private static async Task<Guid> CreateOwnHouseholdAsync(HttpClient owner, TestUser? member = null, string? name = null)
    {
        var household = await PostAsync<IdDto>(owner, "/api/households", new { name = name ?? $"Household {Guid.NewGuid():N}" });
        if (member is not null)
        {
            await PostAsync<IdDto>(owner, $"/api/households/{household.Id}/members", new { email = member.Email, role = "member" });
        }

        return household.Id;
    }

    private static async Task<Guid> TaggedTransactionAsync(HttpClient client, Guid account, Guid tag) =>
        (await RecordTransactionAsync(
            client,
            new { accountId = account, type = "expense", amount = "4.00", date = Date, tagIds = new[] { tag } })).Id;

    private static async Task<Guid> CreateRuleAsync(HttpClient client, string name, Guid category, Guid[] tagIds) =>
        (await PostAsync<IdDto>(
            client,
            "/api/categorization-rules",
            new { name, match = "contains", pattern = name, categoryId = category, tagIds })).Id;

    private static async Task<List<RuleRow>> RulesAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<RuleRow>>("/api/categorization-rules"))!;

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, string kind, Guid entityId) =>
        client.PostAsJsonAsync("/api/trash/restore", new { kind, entityId });

    private static async Task<PageDto<TrashRow>> TrashAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash"))!;

    private async Task<CategoryState> CategoryStateAsync(Guid userId, Guid id)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var categoryId = new CategoryId(id);
        return new CategoryState(
            await db.Categories.IgnoreQueryFilters().Where(c => c.Id == categoryId).Select(c => c.IsDeleted).SingleAsync(),
            await db.Transactions.IgnoreQueryFilters().CountAsync(t => t.CategoryId == categoryId),
            await db.TransactionLines.CountAsync(l => l.CategoryId == categoryId),
            await db.RecurringBills.IgnoreQueryFilters().CountAsync(b => b.CategoryId == categoryId),
            await db.Budgets.IgnoreQueryFilters().CountAsync(b => b.CategoryId == categoryId && !b.IsDeleted));
    }

    private async Task<bool> BudgetDeletedAsync(Guid userId, Guid id)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var budgetId = new BudgetId(id);
        return await db.Budgets.IgnoreQueryFilters().Where(b => b.Id == budgetId).Select(b => b.IsDeleted).SingleAsync();
    }

    private async Task OccupyBudgetSlotAsync(Guid userId, Guid category)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        db.Budgets.Add(new Budget
        {
            UserId = userId,
            CategoryId = new CategoryId(category),
            LimitAmount = new Money(99m, Currency.Eur),
            Period = BudgetPeriod.Monthly,
        });
        await db.SaveChangesAsync();
    }

    private async Task<List<Guid>> TagLinksAsync(Guid userId, Guid tag)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var tagId = new Domain.Tags.TagId(tag);
        var links = await db.TransactionTags.Where(t => t.TagId == tagId).Select(t => t.TransactionId).ToListAsync();
        return [.. links.Select(l => l.Value).Order()];
    }

    private async Task EraseTransactionAsync(Guid userId, Guid id)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var transactionId = new TransactionId(id);
        await db.Transactions.IgnoreQueryFilters().Where(t => t.Id == transactionId).ExecuteDeleteAsync();
    }

    private async Task FillRulesAsync(Guid userId, Guid category, int count)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        db.CategorizationRules.AddRange(Enumerable.Range(0, count).Select(index => new CategorizationRule
        {
            UserId = userId,
            Name = $"Rule {index}",
            Position = index,
            Match = DescriptionMatch.Contains,
            Pattern = $"p{index}",
            CategoryId = new CategoryId(category),
        }));
        await db.SaveChangesAsync();
    }

    private async Task<List<Guid>> SharingAsync(Guid userId, Guid household)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var householdId = new HouseholdId(household);
        var accounts = await db.Accounts.IgnoreQueryFilters()
            .Where(a => a.HouseholdId == householdId && a.Scope == Scope.Shared)
            .Select(a => a.Id)
            .ToListAsync();
        var categories = await db.Categories.IgnoreQueryFilters()
            .Where(c => c.HouseholdId == householdId && c.Scope == Scope.Shared)
            .Select(c => c.Id)
            .ToListAsync();
        var tags = await db.Tags.IgnoreQueryFilters()
            .Where(t => t.HouseholdId == householdId && t.Scope == Scope.Shared)
            .Select(t => t.Id)
            .ToListAsync();
        return [.. accounts.Select(a => a.Value).Concat(categories.Select(c => c.Value)).Concat(tags.Select(t => t.Value)).Order()];
    }

    private async Task DemoteAsync(Guid userId, Guid household)
    {
        using var scope = Services.CreateScope();
        await using var db = OpenAs(scope, userId);
        var householdId = new HouseholdId(household);
        await db.HouseholdMemberships.IgnoreQueryFilters()
            .Where(m => m.HouseholdId == householdId && m.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.Role, HouseholdRole.Member));
    }

    private static AppDbContext OpenAs(IServiceScope scope, Guid userId) => new(
        scope.ServiceProvider.GetRequiredService<DbContextOptions<AppDbContext>>(),
        new TestCurrentUser(userId));

    private sealed record CategoryState(bool IsDeleted, int Transactions, int Lines, int Bills, int LiveBudgets);

    private sealed record TrashRow(Guid Id, string Kind, Guid EntityId, string Description, DateTimeOffset DeletedAt);

    private sealed record NamedRow(Guid Id, string Name);

    private sealed record RuleRow(Guid Id, string Name, int Position, List<Guid> TagIds);
}
