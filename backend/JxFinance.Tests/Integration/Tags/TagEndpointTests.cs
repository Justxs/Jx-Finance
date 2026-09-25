using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Tags;

[Collection<IntegrationCollection>]
public sealed class TagEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_new_user_starts_without_tags()
    {
        using var member = await CreateUserClientAsync();

        var tags = await member.GetFromJsonAsync<List<TagDto>>("/api/tags", TestContext.Current.CancellationToken);

        Assert.Empty(tags!);
    }

    [Fact]
    public async Task Create_and_rename_a_tag()
    {
        using var member = await CreateUserClientAsync();
        var createResponse = await member.PostAsJsonAsync("/api/tags", new { name = "Holiday 2026" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<TagDto>(TestContext.Current.CancellationToken);
        Assert.Equal("Holiday 2026", created!.Name);
        Assert.Equal("personal", created.Scope);

        var renameResponse = await member.PutAsJsonAsync($"/api/tags/{created.Id}", new { name = "Holiday" }, TestContext.Current.CancellationToken);
        renameResponse.EnsureSuccessStatusCode();
        var renamed = await renameResponse.Content.ReadFromJsonAsync<TagDto>(TestContext.Current.CancellationToken);

        Assert.Equal("Holiday", renamed!.Name);
    }

    [Fact]
    public async Task A_name_is_unique_per_owner_whatever_the_casing()
    {
        using var member = await CreateUserClientAsync();
        await PostAsync<IdDto>(member, "/api/tags", new { name = "Reimbursable" });

        var again = await member.PostAsJsonAsync("/api/tags", new { name = "  reimbursable " }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(again, HttpStatusCode.Conflict, "conflict.duplicate");
    }

    [Fact]
    public async Task Another_user_may_use_the_same_name()
    {
        using var first = await CreateUserClientAsync();
        using var second = await CreateUserClientAsync();
        await PostAsync<IdDto>(first, "/api/tags", new { name = "Renovation" });

        var theirs = await second.PostAsJsonAsync("/api/tags", new { name = "Renovation" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, theirs.StatusCode);
    }

    [Fact]
    public async Task Renaming_a_tag_onto_another_of_its_own_name_is_refused_but_keeping_the_name_is_not()
    {
        using var member = await CreateUserClientAsync();
        var holiday = await CreateTagAsync("Holiday", client: member);
        await CreateTagAsync("Renovation", client: member);

        var clash = await member.PutAsJsonAsync($"/api/tags/{holiday}", new { name = "Renovation" }, TestContext.Current.CancellationToken);
        var unchanged = await member.PutAsJsonAsync($"/api/tags/{holiday}", new { name = "Holiday" }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(clash, HttpStatusCode.Conflict, "conflict.duplicate");
        unchanged.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task A_deleted_name_becomes_free_again()
    {
        using var member = await CreateUserClientAsync();
        var tag = await CreateTagAsync("Wedding", client: member);

        var deleted = await member.DeleteAsync($"/api/tags/{tag}", TestContext.Current.CancellationToken);
        var again = await member.PostAsJsonAsync("/api/tags", new { name = "Wedding" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
    }

    [Fact]
    public async Task A_shared_tag_is_visible_to_the_household_and_only_its_owner_may_delete_it()
    {
        var other = await CreateUserAsync();
        var household = await CreateHouseholdAsync(other);
        var tag = await CreateTagAsync("Garden", household);
        using var member = await LoginAsync(other);

        var theirTags = await member.GetFromJsonAsync<List<TagDto>>("/api/tags", TestContext.Current.CancellationToken);
        var theirDelete = await member.DeleteAsync($"/api/tags/{tag}", TestContext.Current.CancellationToken);
        var theirRename = await member.PutAsJsonAsync($"/api/tags/{tag}", new { name = "Garden work", scope = "shared", householdId = household }, TestContext.Current.CancellationToken);

        Assert.Contains(theirTags!, t => t.Id == tag && t.Scope == "shared");
        await AssertProblemAsync(theirDelete, HttpStatusCode.Forbidden, "access.forbidden");
        theirRename.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task A_tag_of_a_household_the_caller_does_not_belong_to_is_invisible()
    {
        using var outsider = await CreateUserClientAsync();
        var other = await CreateUserAsync();
        var household = await CreateHouseholdAsync(other);
        var tag = await CreateTagAsync("Private matter", household);

        var tags = await outsider.GetFromJsonAsync<List<TagDto>>("/api/tags", TestContext.Current.CancellationToken);
        var edit = await outsider.PutAsJsonAsync($"/api/tags/{tag}", new { name = "Mine now" }, TestContext.Current.CancellationToken);

        Assert.DoesNotContain(tags!, t => t.Id == tag);
        Assert.Equal(HttpStatusCode.NotFound, edit.StatusCode);
    }

    [Fact]
    public async Task An_active_household_hides_the_tags_of_the_other_household_and_keeps_personal_ones()
    {
        using var member = await CreateUserClientAsync();
        var first = await Seed.HouseholdAsync(member);
        var second = await Seed.HouseholdAsync(member);
        var firstTag = await CreateTagAsync("First tag", first, member);
        var secondTag = await CreateTagAsync("Second tag", second, member);
        var personalTag = await CreateTagAsync("Personal tag", client: member);

        var everything = await TagsAsync(member, null);
        var narrowed = await TagsAsync(member, first);

        Assert.Contains(everything, t => t.Id == firstTag);
        Assert.Contains(everything, t => t.Id == secondTag);
        Assert.Contains(narrowed, t => t.Id == firstTag);
        Assert.DoesNotContain(narrowed, t => t.Id == secondTag);
        Assert.Contains(narrowed, t => t.Id == personalTag);
    }

    [Fact]
    public async Task A_shared_tag_needs_a_household_the_caller_belongs_to()
    {
        using var member = await CreateUserClientAsync();

        var withoutHousehold = await member.PostAsJsonAsync("/api/tags", new { name = "Nowhere", scope = "shared" }, TestContext.Current.CancellationToken);
        var foreignHousehold = await CreateHouseholdAsync();
        var notAMember = await member.PostAsJsonAsync(
            "/api/tags",
            new { name = "Not mine", scope = "shared", householdId = foreignHousehold }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(withoutHousehold, HttpStatusCode.BadRequest, "household.required");
        await AssertProblemAsync(notAMember, HttpStatusCode.BadRequest, "household.notMember");
    }

    private static Task<List<TagDto>> TagsAsync(HttpClient client, Guid? household) =>
        GetScopedAsync<List<TagDto>>(client, "/api/tags", household);

    private sealed record TagDto(Guid Id, string Name, string Scope, Guid? HouseholdId);
}
