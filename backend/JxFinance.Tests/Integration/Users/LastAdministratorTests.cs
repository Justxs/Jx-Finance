using System.Net;
using System.Net.Http.Json;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Endpoints.Users.UpdateUserRole;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Users;

[Collection<IntegrationCollection>]
public sealed class LastAdministratorTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_last_active_administrator_cannot_be_demoted_or_deactivated()
    {
        var last = await CreateUserAsync(AppRoles.Admin);
        var actor = await CreateUserAsync();
        var removed = await RemoveOtherAdministratorsAsync(last.Id);
        try
        {
            using var scope = Services.CreateScope();
            var users = ActivatorUtilities.CreateInstance<UserService>(scope.ServiceProvider, new FixedUser(actor.Id));

            var demoted = await users.ChangeRoleAsync(new UpdateUserRoleRequest(last.Id, AppRoles.Member), TestContext.Current.CancellationToken);
            var deactivated = await users.DeactivateAsync(last.Id, TestContext.Current.CancellationToken);
            var kept = await users.ChangeRoleAsync(new UpdateUserRoleRequest(last.Id, AppRoles.Admin), TestContext.Current.CancellationToken);

            Assert.Equal(ErrorCodes.UserLastAdministrator, demoted.ErrorCode);
            Assert.Equal(ErrorCodes.UserLastAdministrator, deactivated.ErrorCode);
            Assert.True(kept.IsSuccess);
            Assert.Equal([last.Id], await ActiveAdministratorsAsync());
        }
        finally
        {
            await RestoreAdministratorsAsync(removed);
        }
    }

    [Fact]
    public async Task A_deactivated_administrator_does_not_count_as_the_one_that_remains()
    {
        var last = await CreateUserAsync(AppRoles.Admin);
        var inactive = await CreateUserAsync(AppRoles.Admin);
        (await Client.PostAsync($"/api/users/{inactive.Id}/deactivate", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var removed = await RemoveOtherAdministratorsAsync(last.Id, inactive.Id);
        try
        {
            using var scope = Services.CreateScope();
            var users = ActivatorUtilities.CreateInstance<UserService>(scope.ServiceProvider, new FixedUser(inactive.Id));

            var demoted = await users.ChangeRoleAsync(new UpdateUserRoleRequest(last.Id, AppRoles.Member), TestContext.Current.CancellationToken);

            Assert.Equal(ErrorCodes.UserLastAdministrator, demoted.ErrorCode);
        }
        finally
        {
            await RestoreAdministratorsAsync(removed);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Two_administrators_removing_each_other_at_once_cannot_both_succeed(bool deactivate)
    {
        var first = await CreateUserAsync(AppRoles.Admin);
        var second = await CreateUserAsync(AppRoles.Admin);
        using var firstClient = await LoginAsync(first);
        using var secondClient = await LoginAsync(second);
        var removed = await RemoveOtherAdministratorsAsync(first.Id, second.Id);
        try
        {
            var responses = await Task.WhenAll(
                firstClient.PutAsJsonAsync($"/api/users/{second.Id}/role", new { role = AppRoles.Member }, TestContext.Current.CancellationToken),
                deactivate
                    ? secondClient.PostAsync($"/api/users/{first.Id}/deactivate", null, TestContext.Current.CancellationToken)
                    : secondClient.PutAsJsonAsync($"/api/users/{first.Id}/role", new { role = AppRoles.Member }, TestContext.Current.CancellationToken));

            Assert.Single(responses, r => r.IsSuccessStatusCode);
            var rejected = responses.Single(r => !r.IsSuccessStatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, rejected.StatusCode);
            Assert.Contains(ErrorCodes.UserLastAdministrator, await rejected.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
            Assert.Single(await ActiveAdministratorsAsync());
        }
        finally
        {
            await RestoreAdministratorsAsync(removed);
        }
    }

    private Task<List<IdentityUserRole<Guid>>> RemoveOtherAdministratorsAsync(params Guid[] keep) =>
        WithDbAsync(async db =>
        {
            var adminRole = await db.Roles.Where(r => r.Name == AppRoles.Admin).Select(r => r.Id)
                .SingleAsync(TestContext.Current.CancellationToken);
            var others = await db.UserRoles.Where(r => r.RoleId == adminRole && !keep.Contains(r.UserId))
                .ToListAsync(TestContext.Current.CancellationToken);
            db.UserRoles.RemoveRange(others);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
            return others;
        });

    private Task RestoreAdministratorsAsync(List<IdentityUserRole<Guid>> removed) =>
        WithDbAsync(async db =>
        {
            db.UserRoles.AddRange(removed.Select(r => new IdentityUserRole<Guid> { UserId = r.UserId, RoleId = r.RoleId }));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

    private Task<List<Guid>> ActiveAdministratorsAsync() =>
        WithDbAsync(db => (
            from userRole in db.UserRoles
            join role in db.Roles on userRole.RoleId equals role.Id
            join user in db.Users on userRole.UserId equals user.Id
            where role.Name == AppRoles.Admin && (user.LockoutEnd == null || user.LockoutEnd < AppUser.DeactivatedUntil)
            select user.Id).ToListAsync(TestContext.Current.CancellationToken));
}
