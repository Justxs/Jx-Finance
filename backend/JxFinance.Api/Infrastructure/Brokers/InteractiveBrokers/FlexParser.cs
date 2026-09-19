using System.Globalization;
using System.Xml;
using System.Xml.Linq;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Brokers.InteractiveBrokers;

public static class FlexParser
{
    private static readonly string[] DateFormats = ["yyyyMMdd", "yyyy-MM-dd"];
    private static readonly string[] SummaryTradeRows = ["ORDER", "CLOSED_LOT", "SYMBOL_SUMMARY", "ASSET_SUMMARY", "WASH_SALE"];
    private static readonly string[] SummaryCashRows = ["SUMMARY"];
    private static readonly string[] SummaryPositionRows = ["LOT"];

    public static async Task<Result<FlexStatement>> ParseAsync(Stream stream, CancellationToken cancellationToken)
    {
        XDocument document;
        try
        {
            var settings = new XmlReaderSettings { Async = true, DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null };
            using var reader = XmlReader.Create(stream, settings);
            document = await XDocument.LoadAsync(reader, LoadOptions.None, cancellationToken);
        }
        catch (XmlException)
        {
            return Invalid();
        }

        var statements = document.Root?.Name.LocalName == "FlexQueryResponse"
            ? document.Root.Descendants("FlexStatement").ToList()
            : [];
        if (statements.Count == 0)
        {
            return Invalid();
        }

        var unreadable = 0;
        List<T> Read<T>(string section, string element, string[] skipped, Func<XElement, T?> map) where T : class
        {
            var items = new List<T>();
            foreach (var node in statements.Elements(section).Elements(element))
            {
                if (skipped.Contains(Text(node, "levelOfDetail"), StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (map(node) is { } item)
                {
                    items.Add(item);
                }
                else
                {
                    unreadable++;
                }
            }

            return items;
        }

        return Result<FlexStatement>.Success(new FlexStatement(
            statements.Select(s => Text(s, "accountId")).OfType<string>().Distinct().ToList(),
            Read("Trades", "Trade", SummaryTradeRows, Trade),
            Read("CashTransactions", "CashTransaction", SummaryCashRows, CashTransaction),
            Read("OpenPositions", "OpenPosition", SummaryPositionRows, OpenPosition),
            unreadable));
    }

    private static Result<FlexStatement> Invalid() => Result<FlexStatement>.Failure(
        ErrorCodes.ImportInvalidFile,
        "The file is not an Interactive Brokers Flex Query report in XML format.");

    private static FlexTrade? Trade(XElement node)
    {
        var id = Text(node, "tradeID") ?? Text(node, "transactionID");
        if (id is null
            || Instrument(node) is not { } instrument
            || Date(node, "tradeDate", "dateTime", "reportDate") is not { } date
            || Number(node, "quantity") is not { } quantity
            || Number(node, "tradePrice") is not { } price)
        {
            return null;
        }

        if (quantity == 0m)
        {
            return null;
        }

        var commissionCurrency = CurrencyCode.TryParse(Text(node, "ibCommissionCurrency"), out var parsed) ? parsed : instrument.Currency;

        return new FlexTrade(
            id,
            instrument,
            date,
            quantity,
            price,
            Number(node, "proceeds") ?? -(quantity * price),
            Number(node, "taxes") ?? 0m,
            Number(node, "ibCommission") ?? 0m,
            commissionCurrency);
    }

    private static FlexCashTransaction? CashTransaction(XElement node)
    {
        if (Text(node, "transactionID") is not { } id
            || Text(node, "type") is not { } type
            || Date(node, "settleDate", "dateTime", "reportDate") is not { } date
            || Number(node, "amount") is not { } amount
            || !CurrencyCode.TryParse(Text(node, "currency"), out var currency))
        {
            return null;
        }

        return new FlexCashTransaction(id, type, Instrument(node), date, amount, currency, Text(node, "description"));
    }

    private static FlexOpenPosition? OpenPosition(XElement node) =>
        Instrument(node) is { } instrument
        && Date(node, "reportDate") is { } date
        && Number(node, "markPrice") is { } price
            ? new FlexOpenPosition(instrument, date, price)
            : null;

    private static FlexInstrument? Instrument(XElement node)
    {
        if (Text(node, "symbol") is not { } symbol || !CurrencyCode.TryParse(Text(node, "currency"), out var currency))
        {
            return null;
        }

        return new FlexInstrument(
            long.TryParse(Text(node, "conid"), NumberStyles.None, CultureInfo.InvariantCulture, out var conid) ? conid : null,
            symbol,
            Text(node, "description") ?? symbol,
            Text(node, "isin") ?? (Text(node, "securityIDType") == "ISIN" ? Text(node, "securityID") : null),
            Text(node, "listingExchange"),
            Text(node, "assetCategory") ?? string.Empty,
            Text(node, "subCategory"),
            currency);
    }

    private static string? Text(XElement node, string attribute)
    {
        var value = node.Attribute(attribute)?.Value.Trim();
        return string.IsNullOrEmpty(value) ? null : value;
    }

    private static decimal? Number(XElement node, string attribute) =>
        decimal.TryParse(Text(node, attribute), NumberStyles.Float, CultureInfo.InvariantCulture, out var value) ? value : null;

    private static DateOnly? Date(XElement node, params string[] attributes)
    {
        foreach (var attribute in attributes)
        {
            var text = Text(node, attribute)?.Split(';', ',', ' ', 'T')[0];
            if (text is { Length: > 8 } && text.All(char.IsAsciiDigit))
            {
                text = text[..8];
            }

            if (DateOnly.TryParseExact(text, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                return date;
            }
        }

        return null;
    }
}
