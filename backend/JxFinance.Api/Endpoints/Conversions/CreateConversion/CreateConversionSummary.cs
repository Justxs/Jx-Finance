using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.CreateConversion;

public sealed class CreateConversionSummary : Summary<CreateConversionEndpoint, CreateConversionRequest>
{
    public CreateConversionSummary()
    {
        Summary = "Convert currency inside an account";
        Description = "Records an exchange of one currency for another inside a single account, such as "
            + "selling euros for dollars at a broker. The sold balance drops, the bought balance rises, and "
            + "neither side counts as income or expense. An optional fee is booked as an ordinary expense "
            + "transaction on the same account so it shows in reports and budgets.";
        ExampleRequest = new CreateConversionRequest(
            Guid.Empty,
            "1000.00",
            Currency.Eur,
            "1084.20",
            Currency.Usd,
            new DateOnly(2026, 9, 12),
            "Fund the USD sleeve",
            "2.00",
            Currency.Eur);
        RequestParam(r => r.FromAmount, "Amount sold, as a decimal string greater than zero.");
        RequestParam(r => r.ToAmount, "Amount bought, as a decimal string greater than zero.");
        RequestParam(r => r.FeeAmount, "Optional fee. It is charged on top of the sold or bought amount.");
        RequestParam(r => r.FeeCurrency, "Currency of the fee; one of the two converted currencies. Defaults to the sold currency.");
        RequestParam(r => r.FeeCategoryId, "Optional expense category for the fee transaction.");
        Responses[201] = "The conversion was recorded. The Location header points at it.";
        Responses[400] = "Validation failed, the account is not visible to you, or no exchange rate exists for the fee.";
    }
}
