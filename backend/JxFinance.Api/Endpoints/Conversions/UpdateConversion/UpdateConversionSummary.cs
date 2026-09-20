using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.UpdateConversion;

public sealed class UpdateConversionSummary : Summary<UpdateConversionEndpoint, UpdateConversionRequest>
{
    public UpdateConversionSummary()
    {
        Summary = "Update a currency conversion";
        Description = "Replaces the date, the sold and bought amounts and currencies, the description and the fee "
            + "of a conversion; the account stays the same. The fee fields describe the fee as it should be "
            + "afterwards: with feeAmount the linked expense transaction is created or updated (amount, currency, "
            + "date, category, and its value in the reporting currency at the rate for the new date), without "
            + "feeAmount an existing fee transaction is deleted. Conversion and fee change together or not at all. "
            + "A fee transaction that the user has split into lines cannot be changed or removed from here and "
            + "answers transaction.splitNotAllowed; edit that transaction instead. A conversion imported from a "
            + "broker (isImported) answers resource.readOnly: correct it at the broker and import again.";
        ExampleRequest = new UpdateConversionRequest(
            Guid.Empty,
            1000.00m,
            Currency.Eur,
            1084.20m,
            Currency.Usd,
            new DateOnly(2026, 9, 12),
            "Fund the USD sleeve",
            2.00m,
            Currency.Eur);
        Params["id"] = "The conversion id. Takes precedence over the id in the body.";
        RequestParam(r => r.FromAmount, "Amount sold, as a decimal string greater than zero.");
        RequestParam(r => r.ToAmount, "Amount bought, as a decimal string greater than zero.");
        RequestParam(r => r.FeeAmount, "The fee after the update. Leave it out to remove the fee.");
        RequestParam(r => r.FeeCurrency, "Currency of the fee; one of the two converted currencies. Defaults to the sold currency.");
        RequestParam(r => r.FeeCategoryId, "Expense category of the fee transaction. Leave it out for none.");
        Responses[200] = "The updated conversion.";
        Responses[400] = "Validation failed, a currency is not enabled, no exchange rate exists for the fee, "
            + "the fee transaction is split, or the conversion was imported from a broker.";
        Responses[404] = "No conversion with that id is visible to you.";
    }
}
