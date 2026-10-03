using System.Globalization;
using System.Text.RegularExpressions;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Imports.Parsing;

public static partial class OfxParser
{
    public static Result<ParsedStatement> Parse(Stream stream, Currency accountCurrency)
    {
        var text = StatementText.Read(stream);
        var start = text.IndexOf("<OFX>", StringComparison.OrdinalIgnoreCase);
        if (start < 0)
        {
            return Invalid();
        }

        var body = text[start..];
        var currency = CurrencyCode.TryParse(Value(body, "CURDEF"), out var declared) ? declared : accountCurrency;
        var rows = new List<ParsedRow>();
        var unreadable = 0;
        foreach (Match block in TransactionPattern().Matches(body))
        {
            if (Row(block.Groups["body"].Value, currency) is { } row)
            {
                rows.Add(row);
            }
            else
            {
                unreadable++;
            }
        }

        if (rows.Count == 0 && unreadable == 0 && !body.Contains("<BANKTRANLIST>", StringComparison.OrdinalIgnoreCase))
        {
            return Invalid();
        }

        if (rows.Count > ParsedStatement.MaxRows)
        {
            return Invalid();
        }

        ImportReferences.Disambiguate(rows);

        var ledger = Block(body, "LEDGERBAL");
        var balance = Amount(Value(ledger, "BALAMT"));
        var accountId = Iban.Normalize(Value(Block(body, "BANKACCTFROM"), "ACCTID"));
        return new ParsedStatement(
            rows,
            accountId is { Length: >= 15 } && char.IsLetter(accountId[0]) ? accountId : null,
            Date(Value(ledger, "DTASOF")),
            balance is { } amount ? new Money(amount, currency) : null,
            0,
            unreadable);
    }

    private static ParsedRow? Row(string block, Currency currency)
    {
        var signed = Amount(Value(block, "TRNAMT"));
        var date = Date(Value(block, "DTPOSTED")) ?? Date(Value(block, "DTUSER"));
        if (signed is not { } amount || amount == 0m || date is not { } posted)
        {
            return null;
        }

        var type = amount > 0m ? FlowType.Income : FlowType.Expense;
        var payee = Value(block, "NAME") ?? Value(Block(block, "PAYEE"), "NAME");
        var memo = Value(block, "MEMO");
        var description = (memo ?? payee)?[..Math.Min((memo ?? payee)!.Length, ParsedStatement.DescriptionMaxLength)];
        var fitId = Value(block, "FITID");
        var reference = fitId is { Length: > 0 and <= ImportReferences.MaxLength }
            ? fitId
            : ImportReferences.Hash($"{posted:yyyy-MM-dd}|{amount.ToString(CultureInfo.InvariantCulture)}|{payee}|{memo}|{fitId}");

        return new ParsedRow(reference, posted, payee, description, Math.Abs(amount), type, currency);
    }

    private static string? Value(string? block, string tag)
    {
        if (block is null)
        {
            return null;
        }

        var match = Regex.Match(block, $@"<{tag}>([^<\r\n]*)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));
        var value = match.Success ? System.Net.WebUtility.HtmlDecode(match.Groups[1].Value).Trim() : null;
        return value is { Length: > 0 } ? value : null;
    }

    private static string? Block(string? body, string tag)
    {
        if (body is null)
        {
            return null;
        }

        var match = Regex.Match(
            body,
            $@"<{tag}>(.*?)(</{tag}>|$)",
            RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.CultureInvariant,
            TimeSpan.FromSeconds(1));
        return match.Success ? match.Groups[1].Value : null;
    }

    private static decimal? Amount(string? text) =>
        decimal.TryParse(text?.Replace(',', '.'), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value)
            ? Money.Round(value)
            : null;

    private static DateOnly? Date(string? text) =>
        text is { Length: >= 8 }
        && DateOnly.TryParseExact(text[..8], "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;

    private static DomainError Invalid() => new(
        ErrorCodes.ImportInvalidFile,
        "The file is not an OFX or QFX bank statement.");

    [GeneratedRegex(@"<STMTTRN>(?<body>.*?)(?=</STMTTRN>|<STMTTRN>|</BANKTRANLIST>)", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.CultureInvariant, 2000)]
    private static partial Regex TransactionPattern();
}
