using System.Reflection;
using NetArchTest.Rules;

namespace JxFinance.Tests.Architecture;

public class LayeringTests
{
    private static readonly Assembly ApiAssembly = typeof(Program).Assembly;

    [Fact]
    public void Endpoint_classes_do_not_access_data_directly()
    {
        var result = Types.InAssembly(ApiAssembly)
            .That().ResideInNamespace("JxFinance.Endpoints")
            .And().HaveNameEndingWith("Endpoint")
            .ShouldNot().HaveDependencyOnAny(
                "JxFinance.Infrastructure.Data",
                "Microsoft.EntityFrameworkCore")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureMessage(result));
    }

    [Fact]
    public void Domain_DependsOnNothing()
    {
        var result = Types.InAssembly(ApiAssembly)
            .That().ResideInNamespace("JxFinance.Domain")
            .ShouldNot().HaveDependencyOnAny(
                "JxFinance.Endpoints",
                "JxFinance.Infrastructure",
                "JxFinance.Common",
                "JxFinance.Extensions",
                "Microsoft.EntityFrameworkCore",
                "Microsoft.AspNetCore",
                "FastEndpoints")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureMessage(result));
    }

    private static string FailureMessage(TestResult result)
    {
        var failing = result.FailingTypes?.Select(type => type.FullName) ?? [];
        return $"Layering violation in: {string.Join(", ", failing)}";
    }
}
