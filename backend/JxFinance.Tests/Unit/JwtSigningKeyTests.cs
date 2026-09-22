using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using Microsoft.Extensions.Configuration;

namespace JxFinance.Tests.Unit;

public sealed class JwtSigningKeyTests : IDisposable
{
    private const string FileName = "jwt-signing.key";

    private readonly string directory = Path.Combine(Path.GetTempPath(), "jx-jwt-key-tests", Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(directory))
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public void Key_is_created_once_and_reused_on_the_next_start()
    {
        var first = JwtSigningKey.Resolve(Configuration(directory));
        var second = JwtSigningKey.Resolve(Configuration(directory));

        Assert.Equal(64, Convert.FromBase64String(first.Value).Length);
        Assert.Equal(first, second);
        Assert.Equal(first.Value, File.ReadAllText(Path.Combine(directory, FileName)));
    }

    [Fact]
    public void Stored_key_is_read_without_surrounding_whitespace()
    {
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, FileName), "  stored-key-value\n");

        Assert.Equal("stored-key-value", JwtSigningKey.Resolve(Configuration(directory)).Value);
    }

    [Fact]
    public void Configured_key_wins_and_nothing_is_written()
    {
        var key = JwtSigningKey.Resolve(Configuration(directory, configuredKey: "configured-key"));

        Assert.Equal("configured-key", key.Value);
        Assert.False(Directory.Exists(directory));
    }

    [Fact]
    public void Without_a_key_directory_every_start_gets_a_new_key()
    {
        var first = JwtSigningKey.Resolve(Configuration(null));
        var second = JwtSigningKey.Resolve(Configuration(null));

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void Blank_key_file_is_replaced_by_a_new_key_that_is_then_reused()
    {
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, FileName), " \n");

        var first = JwtSigningKey.Resolve(Configuration(directory));
        var second = JwtSigningKey.Resolve(Configuration(directory));

        Assert.Equal(64, Convert.FromBase64String(first.Value).Length);
        Assert.Equal(first, second);
    }

    [Fact]
    public void Key_file_that_cannot_be_read_stops_the_start_instead_of_falling_back_to_a_temporary_key()
    {
        Directory.CreateDirectory(Path.Combine(directory, FileName));

        var error = Record.Exception(() => JwtSigningKey.Resolve(Configuration(directory)));

        Assert.True(error is UnauthorizedAccessException or IOException, error?.ToString());
    }

    private static IConfiguration Configuration(string? keyDirectory, string? configuredKey = null) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [ConfigKeys.DataProtectionDirectory] = keyDirectory,
                [ConfigKeys.JwtSigningKey] = configuredKey,
            })
            .Build();
}
