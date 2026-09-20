using JxFinance.Common.Validation;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.CreateConversion;

public sealed class CreateConversionValidator : ConversionInputValidator<CreateConversionRequest>
{
    public CreateConversionValidator()
    {
        RuleFor(r => r.AccountId).IsRequired();
    }
}
