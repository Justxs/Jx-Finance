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
    private static readonly SharingState SharedBefore = new(Scope.Shared, new HouseholdId(Guid.NewGuid()));

    [Fact]
    public async Task Only_the_owner_can_change_sharing()
    {
        var error = await CheckAsync(Member, Personal(), SharedBefore);

        Assert.Equal(ErrorCodes.AccessForbidden, error?.Code);
    }

    [Fact]
    public async Task The_owner_can_change_sharing()
    {
        Assert.Null(await CheckAsync(Owner, Personal(), SharedBefore));
    }

    [Fact]
    public async Task A_new_record_has_no_sharing_to_protect()
    {
        Assert.Null(await CheckAsync(Member, Personal(), null));
    }

    [Fact]
    public async Task Unchanged_personal_sharing_passes_for_anyone()
    {
        Assert.Null(await CheckAsync(Member, Personal(), new SharingState(Scope.Personal, null)));
    }

    private static Tag Personal() => new() { Name = "Travel", UserId = Owner };

    private static async Task<DomainError?> CheckAsync(Guid userId, Tag tag, SharingState? previous)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=unused.invalid;Database=unused").Options;
        var user = new SomeUser(userId);
        await using var db = new AppDbContext(options, user);

        return await new SharingGuard(db, user).CheckAsync(tag, previous, TestContext.Current.CancellationToken);
    }

    private sealed record SomeUser(Guid Id) : ICurrentUser;
}
