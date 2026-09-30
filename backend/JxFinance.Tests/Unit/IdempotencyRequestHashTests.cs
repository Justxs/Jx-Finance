using System.Text;
using JxFinance.Common.Middleware;

namespace JxFinance.Tests.Unit;

public sealed class IdempotencyRequestHashTests
{
    private const string Method = "POST";
    private const string Path = "/api/transactions";
    private const string Query = "?x=1";
    private const string Household = "8f7c7a52-7d8f-4e7b-9c1a-2f0f6f0b9e11";

    private static readonly byte[] Body = Encoding.UTF8.GetBytes("{\"amount\":\"12.40\"}");

    [Fact]
    public void The_same_request_hashes_the_same_as_64_lowercase_hex_characters()
    {
        var first = IdempotencyMiddleware.RequestHash(Method, Path, Query, Household, Body);
        var second = IdempotencyMiddleware.RequestHash(Method, Path, Query, Household, Body.ToArray());

        Assert.Equal(first, second);
        Assert.Equal(64, first.Length);
        Assert.Matches("^[0-9a-f]{64}$", first);
    }

    [Fact]
    public void Each_part_of_the_request_changes_the_hash()
    {
        var hashes = new[]
        {
            IdempotencyMiddleware.RequestHash(Method, Path, Query, Household, Body),
            IdempotencyMiddleware.RequestHash("PUT", Path, Query, Household, Body),
            IdempotencyMiddleware.RequestHash(Method, "/api/transfers", Query, Household, Body),
            IdempotencyMiddleware.RequestHash(Method, Path, "?x=2", Household, Body),
            IdempotencyMiddleware.RequestHash(Method, Path, Query, "", Body),
            IdempotencyMiddleware.RequestHash(Method, Path, Query, Household, Encoding.UTF8.GetBytes("{\"amount\":\"12.41\"}")),
        };

        Assert.Equal(hashes.Length, hashes.Distinct(StringComparer.Ordinal).Count());
    }

    [Fact]
    public void Parts_are_separated_so_moving_text_between_them_changes_the_hash()
    {
        var joined = IdempotencyMiddleware.RequestHash(Method, Path + "?x=1", "", Household, Body);
        var split = IdempotencyMiddleware.RequestHash(Method, Path, "?x=1", Household, Body);

        Assert.NotEqual(joined, split);
    }
}
