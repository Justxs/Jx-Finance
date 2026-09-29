using FluentValidation;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Imports.Shared;

public static class CsvMappingRules
{
    public const int MaxFileBytes = 5 * 1024 * 1024;

    public static IReadOnlyList<string> Delimiters { get; } = [",", ";", "\t", "|"];

    public static IRuleBuilderOptions<T, string?> IsCsvDelimiter<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(delimiter => delimiter is null || Delimiters.Contains(delimiter))
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage("The delimiter is a comma, a semicolon, a tab or a pipe.");
}
