using JxFinance.Common.Errors;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Tags;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class SharingGuardTests
{
    private static readonly Guid Owner = Guid.NewGuid();
    private static readonly Guid Member = Guid.NewGuid();
    private static readonly Input MakePersonal = new(Scope.Personal, null);

    [Fact]
    public async Task Only_the_owner_can_change_sharing()
    {
        var error = await CheckAsync(Member, guard => guard.CheckAsync(Shared(), MakePersonal, Token));

        Assert.Equal(ErrorCodes.AccessForbidden, error?.Code);
    }

    [Fact]
    public async Task The_owner_can_change_sharing()
    {
        Assert.Null(await CheckAsync(Owner, guard => guard.CheckAsync(Shared(), MakePersonal, Token)));
    }

    [Fact]
    public async Task A_new_record_has_no_sharing_to_protect()
    {
        Assert.Null(await CheckAsync(Member, guard => guard.CheckAsync(MakePersonal, Token)));
    }

    [Fact]
    public async Task Unchanged_personal_sharing_passes_for_anyone()
    {
        Assert.Null(await CheckAsync(Member, guard => guard.CheckAsync(Personal(), MakePersonal, Token)));
    }

    [Fact]
    public async Task The_check_leaves_the_existing_record_untouched()
    {
        var tag = Shared();
        var before = SharingState.Of(tag);

        await CheckAsync(Owner, guard => guard.CheckAsync(tag, MakePersonal, Token));

        Assert.Equal(before, SharingState.Of(tag));
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private static Tag Personal() => new() { Name = "Travel", UserId = Owner };

    private static Tag Shared() => new()
    {
        Name = "Travel",
        UserId = Owner,
        Scope = Scope.Shared,
        HouseholdId = new HouseholdId(Guid.NewGuid()),
    };

    private static async Task<DomainError?> CheckAsync(Guid userId, Func<SharingGuard, Task<DomainError?>> check)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=unused.invalid;Database=unused").Options;
        var user = new SomeUser(userId);
        await using var db = new AppDbContext(options, user);

        return await check(new SharingGuard(db, user));
    }

    private sealed record SomeUser(Guid Id) : ICurrentUser;

    private sealed record Input(Scope Scope, Guid? HouseholdId) : IShareableInput;
}
