using System.Reflection;
using System.Text.RegularExpressions;
using FastEndpoints;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed partial class ServiceWiringTests
{
    private const string RegisterHint =
        "Add [RegisterService<TheInterface>(LifeTime.Scoped)] to the implementation (a feature service registers as the interface in its tag's Interfaces folder), "
        + "or register it in Extensions/ApiServiceExtensions.cs or Infrastructure/DependencyInjection.cs.";

    private static readonly Assembly ApiAssembly = typeof(Program).Assembly;

    [Fact]
    public void Every_endpoint_constructor_parameter_resolves_from_the_service_provider()
    {
        var endpoints = ApiAssembly.GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false } && typeof(IEndpoint).IsAssignableFrom(type))
            .ToList();

        Assert.NotEmpty(endpoints);
        AssertResolvable(endpoints);
    }

    [Fact]
    public void Every_registered_service_and_background_job_constructor_parameter_resolves_from_the_service_provider()
    {
        var types = ApiAssembly.GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false }
                && (RegisteredAs(type).Any() || typeof(IHostedService).IsAssignableFrom(type)))
            .ToList();

        Assert.Contains(types, type => typeof(IHostedService).IsAssignableFrom(type));
        AssertResolvable(types);
    }

    [Fact]
    public void Every_service_a_background_job_resolves_is_registered()
    {
        var services = FastEndpointsPipeline.Services.GetRequiredService<IServiceProviderIsService>();
        var jobs = RepoPath.Of(Path.Combine("JxFinance.Api", "Infrastructure", "BackgroundJobs"));
        var resolved = Directory
            .EnumerateFiles(jobs, "*.cs")
            .SelectMany(file => Resolves().Matches(File.ReadAllText(file))
                .Select(match => (File: Path.GetFileName(file), Name: match.Groups["name"].Value)))
            .Distinct()
            .ToList();
        var known = AppDomain.CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic)
            .SelectMany(LoadableTypes)
            .Where(type => resolved.Any(entry => entry.Name == type.Name))
            .ToLookup(type => type.Name);
        var missing = resolved
            .Where(entry => !known[entry.Name].Any(services.IsService))
            .Select(entry =>
                $"Infrastructure/BackgroundJobs/{entry.File} resolves {entry.Name} with GetRequiredService, which no service registers, so the job fails when it next runs. {RegisterHint}")
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.NotEmpty(resolved);
        Assert.True(missing.Count == 0, string.Join(Environment.NewLine, missing));
    }

    [Fact]
    public void Every_registered_endpoint_service_registers_as_an_interface_from_its_tags_Interfaces_folder()
    {
        var tagServices = ApiAssembly.GetTypes()
            .Where(type => type.Namespace?.Split('.') is ["JxFinance", "Endpoints", _, ..])
            .SelectMany(type => RegisteredAs(type).Select(service => (Type: type, Service: service)))
            .ToList();
        var misregistered = tagServices
            .Where(entry => !entry.Service.IsInterface
                || entry.Service.Namespace != $"JxFinance.Endpoints.{TagOf(entry.Type)}.Interfaces"
                || !entry.Service.IsAssignableFrom(entry.Type))
            .Select(entry =>
                $"{entry.Type.FullName} is registered as {entry.Service.FullName}. A class with [RegisterService] under Endpoints/{TagOf(entry.Type)} "
                + $"implements an interface declared in Endpoints/{TagOf(entry.Type)}/Interfaces and registers as it, so endpoints, jobs and other services inject the interface: "
                + $"add I{entry.Type.Name} there and use [RegisterService<I{entry.Type.Name}>]. "
                + "A helper that nothing injects needs no interface: make it a static class, or an internal class the service creates, without [RegisterService].")
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.NotEmpty(tagServices);
        Assert.True(misregistered.Count == 0, string.Join(Environment.NewLine, misregistered));
    }

    private static string TagOf(Type type) => type.Namespace!.Split('.')[2];

    private static IEnumerable<Type> RegisteredAs(Type type) =>
        type.GetCustomAttributes(inherit: false)
            .Select(attribute => attribute.GetType())
            .Where(attribute => attribute.IsGenericType && attribute.GetGenericTypeDefinition() == typeof(RegisterServiceAttribute<>))
            .Select(attribute => attribute.GetGenericArguments()[0]);

    private static void AssertResolvable(IEnumerable<Type> types)
    {
        var services = FastEndpointsPipeline.Services.GetRequiredService<IServiceProviderIsService>();
        var missing = types
            .SelectMany(type => Parameters(type)
                .Where(parameter => !parameter.HasDefaultValue && !services.IsService(parameter.ParameterType))
                .Select(parameter =>
                    $"{type.FullName} takes {parameter.ParameterType.FullName} '{parameter.Name}', which no service registers, so the application cannot create it. {RegisterHint}"))
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.True(missing.Count == 0, string.Join(Environment.NewLine, missing));
    }

    private static ParameterInfo[] Parameters(Type type) =>
        type.GetConstructors().MaxBy(constructor => constructor.GetParameters().Length)?.GetParameters() ?? [];

    private static IEnumerable<Type> LoadableTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException exception)
        {
            return exception.Types.OfType<Type>();
        }
    }

    [GeneratedRegex(@"GetRequiredService<(?<name>\w+)>\(")]
    private static partial Regex Resolves();
}
