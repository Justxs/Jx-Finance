using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public static class DevDataSeeder
{
    public static async Task SeedAsync(
        AppDbContext db,
        UserManager<AppUser> userManager,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Users.AnyAsync(cancellationToken))
        {
            var devUser = new AppUser
            {
                Id = DevCurrentUser.DevUserId,
                UserName = "dev@localhost",
                Email = "dev@localhost",
                EmailConfirmed = true,
            };

            var created = await userManager.CreateAsync(devUser);
            if (!created.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to seed the dev user: {string.Join("; ", created.Errors.Select(e => e.Description))}");
            }

            logger.LogInformation("Seeded the dev user {UserId}.", devUser.Id);
        }

        if (!await db.Categories.IgnoreQueryFilters().AnyAsync(cancellationToken))
        {
            await StarterCategories.AddAsync(db, DevCurrentUser.DevUserId, cancellationToken);
            logger.LogInformation("Seeded {Count} starter categories.", StarterCategories.Count);
        }
    }
}
