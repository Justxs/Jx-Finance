using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Investments.SaveBrokerConnection;

public sealed class SaveBrokerConnectionValidator : Validator<SaveBrokerConnectionRequest>
{
    public SaveBrokerConnectionValidator()
    {
        RuleFor(r => r.QueryId).IsRequired().HasFormat("^[0-9]{1,20}$").WithMessage("The query id is the number shown next to your Flex Query.");
        RuleFor(r => r.Token).HasFormat("^[0-9]{6,64}$").When(r => !string.IsNullOrEmpty(r.Token))
            .WithMessage("The token is the number Interactive Brokers shows when you enable the Flex Web Service.");
        RuleFor(r => r.FundingAccountId).DiffersFrom(r => r.AccountId).WithMessage("The funding account must be a different account.");
    }
}
