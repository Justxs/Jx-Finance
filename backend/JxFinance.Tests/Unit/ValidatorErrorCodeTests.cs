using System.Reflection;
using FluentValidation;
using FluentValidation.Validators;
using JxFinance.Common.Errors;

namespace JxFinance.Tests.Unit;

public sealed class ValidatorErrorCodeTests
{
    private static readonly Assembly ApiAssembly = typeof(Program).Assembly;

    [Fact]
    public void Every_validation_rule_carries_a_published_error_code()
    {
        var validators = ApiAssembly.GetTypes()
            .Where(type => type is { IsAbstract: false, IsClass: true } && typeof(IValidator).IsAssignableFrom(type))
            .ToList();

        Assert.NotEmpty(validators);
        var offenders = validators
            .SelectMany(type => Uncoded((IValidator)Activator.CreateInstance(type)!, type.Name))
            .ToList();

        Assert.True(offenders.Count == 0, "Rules without a code from ErrorCodes:" + Environment.NewLine + string.Join(Environment.NewLine, offenders));
    }

    [Fact]
    public void Published_error_codes_are_unique_and_sorted()
    {
        Assert.Equal(ErrorCodes.All.Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal), ErrorCodes.All);
    }

    private static IEnumerable<string> Uncoded(IValidator validator, string owner)
    {
        foreach (var rule in validator.CreateDescriptor().Rules)
        {
            foreach (var component in rule.Components)
            {
                if (component.Validator is IChildValidatorAdaptor adaptor)
                {
                    foreach (var offender in Children(adaptor).SelectMany(child => Uncoded(child, $"{owner}.{rule.PropertyName}")))
                    {
                        yield return offender;
                    }
                }
                else if (!ErrorCodes.IsKnown(component.ErrorCode))
                {
                    yield return $"{owner}.{rule.PropertyName}: {component.Validator.Name} has code '{component.ErrorCode}'";
                }
            }
        }
    }

    private static IEnumerable<IValidator> Children(IChildValidatorAdaptor adaptor)
    {
        var children = adaptor.GetType()
            .GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .Select(field => field.GetValue(adaptor))
            .OfType<IValidator>()
            .ToList();

        Assert.NotEmpty(children);
        return children;
    }
}
