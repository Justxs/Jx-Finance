using JxFinance.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Api.Common;

public static class WebApplicationExtensions
{
    public static void ApplyMigrations(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }
}
