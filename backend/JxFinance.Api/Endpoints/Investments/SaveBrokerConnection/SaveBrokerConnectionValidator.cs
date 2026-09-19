using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Investments.SaveBrokerConnection;

public sealed class SaveBrokerConnectionValidator : Validator<SaveBrokerConnectionRequest>
{
    public SaveBrokerConnectionValidator()
    {
        RuleFor(r => r.QueryId).NotEmpty().Matches("^[0-9]{1,20}$").WithMessage("The query id is the number shown next to your Flex Query.");
        RuleFor(r => r.Token).Matches("^[0-9]{6,64}$").When(r => !string.IsNullOrEmpty(r.Token))
            .WithMessage("The token is the number Interactive Brokers shows when you enable the Flex Web Service.");
        RuleFor(r => r.FundingAccountId).NotEqual(r => r.AccountId).WithMessage("The funding account must be a different account.");
    }
}
