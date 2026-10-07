using JxFinance.Infrastructure.Configuration;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace JxFinance.Tests.Unit;

public sealed class DefaultConnectionStringTests
{
    [Theory]
    [InlineData("Host=db;Database=jx;Username=jx", "-c jit=off")]
    [InlineData("Host=db;Database=jx;Username=jx;Options=-c statement_timeout=5000", "-c statement_timeout=5000 -c jit=off")]
    public void The_connection_turns_jit_off_and_keeps_the_options_it_was_given(string configured, string options)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [ConfigKeys.DefaultConnectionSetting] = configured })
            .Build();

        var connection = new NpgsqlConnectionStringBuilder(configuration.DefaultConnectionString());

        Assert.Equal(("db", "jx", "jx", options), (connection.Host, connection.Database, connection.Username, connection.Options));
    }

    [Fact]
    public void A_missing_connection_string_is_refused()
    {
        var configuration = new ConfigurationBuilder().Build();

        Assert.Throws<InvalidOperationException>(() => configuration.DefaultConnectionString());
    }
}
