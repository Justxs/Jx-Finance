using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.CategorizationRules.Shared;

public sealed class RunRulesValidator : Validator<RunRulesRequest>
{
    public RunRulesValidator()
    {
        RuleFor(r => r.AccountId).IsRequired().When(r => r.AccountId is not null);
    }
}
