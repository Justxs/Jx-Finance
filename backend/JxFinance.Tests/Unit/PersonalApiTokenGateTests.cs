using JxFinance.Common;
using JxFinance.Common.Mcp;
using JxFinance.Common.Middleware;
using JxFinance.Domain.Common;
using Microsoft.AspNetCore.Http;

namespace JxFinance.Tests.Unit;

public sealed class PersonalApiTokenGateTests
{
    private static readonly object[] Readable = [TokenReadable.Yes];
    private static readonly object[] OptedOut = [TokenReadable.Yes, TokenReadable.No];
    private static readonly object[] Writable = [TokenReadable.Yes, TokenWritable.Yes];
    private static readonly object[] Unmarked = [];
    private static readonly object[] Mcp = [McpRoute.Instance];

    public static TheoryData<string, bool, string, string?> Decisions => new()
    {
        { HttpMethods.Get, false, nameof(Readable), null },
        { HttpMethods.Get, true, nameof(Readable), null },
        { HttpMethods.Get, true, nameof(OptedOut), nameof(PersonalApiTokenGateMiddleware.NotReadable) },
        { HttpMethods.Get, true, nameof(Unmarked), nameof(PersonalApiTokenGateMiddleware.NotReadable) },
        { HttpMethods.Post, true, nameof(Writable), null },
        { HttpMethods.Put, true, nameof(Writable), null },
        { HttpMethods.Delete, true, nameof(Writable), null },
        { HttpMethods.Post, false, nameof(Writable), nameof(PersonalApiTokenGateMiddleware.ReadOnlyToken) },
        { HttpMethods.Delete, false, nameof(Writable), nameof(PersonalApiTokenGateMiddleware.ReadOnlyToken) },
        { HttpMethods.Post, true, nameof(Readable), nameof(PersonalApiTokenGateMiddleware.NotWritable) },
        { HttpMethods.Post, false, nameof(Readable), nameof(PersonalApiTokenGateMiddleware.NotWritable) },
        { HttpMethods.Patch, true, nameof(Unmarked), nameof(PersonalApiTokenGateMiddleware.NotWritable) },
        { HttpMethods.Post, false, nameof(Mcp), null },
        { HttpMethods.Get, false, nameof(Mcp), null },
        { HttpMethods.Delete, false, nameof(Mcp), null },
    };

    [Theory]
    [MemberData(nameof(Decisions))]
    public void The_gate_decides_by_method_access_and_route_marks(string method, bool canWrite, string marks, string? refusal)
    {
        var decided = PersonalApiTokenGateMiddleware.Refusal(method, canWrite, MarksNamed(marks));

        Assert.Equal(ErrorNamed(refusal), decided);
    }

    [Fact]
    public void Every_refusal_is_token_not_allowed_with_its_own_message()
    {
        DomainError[] refusals =
        [
            PersonalApiTokenGateMiddleware.NotReadable,
            PersonalApiTokenGateMiddleware.NotWritable,
            PersonalApiTokenGateMiddleware.ReadOnlyToken,
        ];

        Assert.All(refusals, refusal => Assert.Equal("token.notAllowed", refusal.Code));
        Assert.Equal(refusals.Length, refusals.Select(refusal => refusal.Message).Distinct().Count());
        Assert.Contains("read-and-write token", PersonalApiTokenGateMiddleware.ReadOnlyToken.Message, StringComparison.Ordinal);
        Assert.Contains("browser session", PersonalApiTokenGateMiddleware.NotWritable.Message, StringComparison.Ordinal);
    }

    private static object[] MarksNamed(string name) => name switch
    {
        nameof(Readable) => Readable,
        nameof(OptedOut) => OptedOut,
        nameof(Writable) => Writable,
        nameof(Mcp) => Mcp,
        _ => Unmarked,
    };

    private static DomainError? ErrorNamed(string? name) => name switch
    {
        nameof(PersonalApiTokenGateMiddleware.NotReadable) => PersonalApiTokenGateMiddleware.NotReadable,
        nameof(PersonalApiTokenGateMiddleware.NotWritable) => PersonalApiTokenGateMiddleware.NotWritable,
        nameof(PersonalApiTokenGateMiddleware.ReadOnlyToken) => PersonalApiTokenGateMiddleware.ReadOnlyToken,
        _ => null,
    };
}
