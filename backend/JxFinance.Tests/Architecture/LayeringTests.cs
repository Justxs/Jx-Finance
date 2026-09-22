using System.Reflection;
using FastEndpoints;
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
    public void Domain_depends_on_nothing()
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

    [Fact]
    public void Infrastructure_outside_background_jobs_does_not_depend_on_endpoints()
    {
        var result = Types.InAssembly(ApiAssembly)
            .That().ResideInNamespace("JxFinance.Infrastructure")
            .And().DoNotResideInNamespace("JxFinance.Infrastructure.BackgroundJobs")
            .ShouldNot().HaveDependencyOnAny("JxFinance.Endpoints")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureMessage(result));
    }

    [Fact]
    public void Endpoints_validators_and_services_are_sealed()
    {
        var result = Types.InAssembly(ApiAssembly)
            .That().ResideInNamespace("JxFinance.Endpoints")
            .And().AreClasses()
            .And().AreNotAbstract()
            .And().AreNotStatic()
            .Should().BeSealed()
            .GetResult();

        Assert.True(result.IsSuccessful, FailureMessage(result));
    }

    [Fact]
    public void No_type_derives_from_a_FastEndpoints_mapper()
    {
        var failing = ApiAssembly.GetTypes()
            .Where(type => BaseTypes(type).Any(IsFastEndpointsMapper))
            .Select(type => type.FullName)
            .ToList();

        Assert.True(failing.Count == 0, $"Layering violation in: {string.Join(", ", failing)}");
    }

    [Fact]
    public void Feature_mappers_are_static_classes()
    {
        var result = Types.InAssembly(ApiAssembly)
            .That().ResideInNamespaceEndingWith(".Mappers")
            .And().AreNotNested()
            .Should().BeStatic()
            .GetResult();

        Assert.True(result.IsSuccessful, FailureMessage(result));
    }

    private static IEnumerable<Type> BaseTypes(Type type)
    {
        for (var baseType = type.BaseType; baseType is not null; baseType = baseType.BaseType)
        {
            yield return baseType;
        }
    }

    private static bool IsFastEndpointsMapper(Type type) =>
        type.Namespace == typeof(IMapper).Namespace && type.Name.Contains("Mapper", StringComparison.Ordinal);

    private static string FailureMessage(NetArchTest.Rules.TestResult result)
    {
        var failing = result.FailingTypes?.Select(type => type.FullName) ?? [];
        return $"Layering violation in: {string.Join(", ", failing)}";
    }
}
