using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.MarketPrices;

public static class MarketPriceErrors
{
    private const int MaxReasonLength = 150;

    public static DomainError KeyRequired { get; } =
        new(ErrorCodes.MarketPricesKeyRequired, "Save an EODHD API key under Settings, Market prices first.");

    public static DomainError Unavailable(string provider) =>
        new(ErrorCodes.MarketPricesUnavailable, $"{provider} could not be reached. Try again later.");

    public static DomainError Rejected(string provider, string reason)
    {
        var text = string.Join(' ', reason.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (text.Length == 0)
        {
            text = "no reason given";
        }

        return new DomainError(
            ErrorCodes.MarketPricesRejected,
            $"{provider} refused: {(text.Length > MaxReasonLength ? text[..MaxReasonLength] : text)}");
    }
}
