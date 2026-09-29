using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace JxFinance.Infrastructure.Data;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable(ConfigKeys.DefaultConnectionVariable);
        var identity = new ServiceCollection()
            .Configure<IdentityOptions>(DependencyInjection.ConfigureIdentity)
            .BuildServiceProvider();

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString).UseApplicationServiceProvider(identity);

        return new AppDbContext(optionsBuilder.Options, new FixedUser(DevDataSeeder.DevUserId), new Time.UtcClock());
    }
}
