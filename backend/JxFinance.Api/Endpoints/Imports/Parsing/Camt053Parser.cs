using System.Globalization;
using System.Xml.Linq;
using JxFinance.Common.Errors;
using JxFinance.Common.Formats;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Imports.Parsing;

public static class Camt053Parser
{
    private const string NamespacePrefix = "urn:iso:std:iso:20022:tech:xsd:camt.053.001.";

    public static async Task<Result<ParsedStatement>> ParseAsync(
        Stream stream,
        string? accountIban,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var root = (await SafeXml.LoadAsync(stream, cancellationToken))?.Root;
        if (root?.Name.LocalName != "Document" || !root.Name.NamespaceName.StartsWith(NamespacePrefix, StringComparison.Ordinal))
        {
            return Invalid();
        }

        var statements = Children(Find(root, "BkToCstmrStmt"), "Stmt").ToList();
        var wanted = Iban.Normalize(accountIban);
        var matching = statements.Count == 1 ? statements : statements.Where(s => IbanOf(s) == wanted).ToList();
        if (matching.Count == 0)
        {
            return statements.Count == 0
                ? Invalid()
                : new DomainError(
                    ErrorCodes.ImportNoStatementForAccount,
                    string.Join(", ", statements.Select(IbanOf)));
        }

        var rows = new List<ParsedRow>();
        var notBooked = 0;
        var unreadable = 0;
        foreach (var entry in matching.SelectMany(s => Children(s, "Ntry")))
        {
            if (Text(entry, "Sts") != "BOOK")
            {
                notBooked++;
            }
            else if (Entry(entry, timeZone) is { } entryRows)
            {
                rows.AddRange(entryRows);
            }
            else
            {
                unreadable++;
            }
        }

        if (rows.Count > ParsedStatement.MaxRows)
        {
            return Invalid();
        }

        ImportReferences.Disambiguate(rows);

        var closing = matching
            .SelectMany(s => Children(s, "Bal"))
            .Where(b => Text(b, "Tp", "CdOrPrtry", "Cd") == "CLBD")
            .MaxBy(b => Date(Find(b, "Dt"), timeZone));
        var closingAmount = Amount(closing);
        return new ParsedStatement(
            rows,
            IbanOf(matching[0]),
            Date(Find(closing, "Dt"), timeZone),
            closingAmount is { } balance && CurrencyOf(closing) is { } currency
                ? new Money(Text(closing, "CdtDbtInd") == "DBIT" ? -balance : balance, currency)
                : null,
            notBooked,
            unreadable);
    }

    private static List<ParsedRow>? Entry(XElement entry, TimeZoneInfo timeZone)
    {
        var amount = Amount(entry);
        var currency = CurrencyOf(entry);
        var direction = Text(entry, "CdtDbtInd");
        var date = Date(Find(entry, "BookgDt"), timeZone) ?? Date(Find(entry, "ValDt"), timeZone);
        if (amount is not > 0 || currency is null || direction is not ("CRDT" or "DBIT") || date is null)
        {
            return null;
        }

        var type = direction == "CRDT" ? FlowType.Income : FlowType.Expense;
        var details = Children(Find(entry, "NtryDtls"), "TxDtls").ToList();
        var amounts = details.Select(d => Amount(d) ?? Amount(Find(d, "AmtDtls", "TxAmt"))).ToList();
        var split = details.Count > 1 && amounts.All(a => a > 0) && amounts.Sum() == amount;
        var parts = split
            ? details.Select((detail, index) => (Detail: (XElement?)detail, Amount: amounts[index]!.Value))
            : [(details.Count == 1 ? details[0] : null, amount.Value)];

        return parts
            .Select((part, index) => Row(entry, part.Detail, split ? $"/{index}" : "", part.Amount, type, currency.Value, date.Value))
            .ToList();
    }

    private static ParsedRow Row(
        XElement entry,
        XElement? detail,
        string suffix,
        decimal amount,
        FlowType type,
        Currency currency,
        DateOnly date)
    {
        var income = type == FlowType.Income;
        var party = Find(detail, "RltdPties", income ? "Dbtr" : "Cdtr");
        var payee = Text(party, "Nm") ?? Text(party, "Pty", "Nm");
        var counterpartyIban = Iban.Normalize(Text(detail, "RltdPties", income ? "DbtrAcct" : "CdtrAcct", "Id", "IBAN"));
        var unstructured = string.Join(" ", Children(Find(detail, "RmtInf"), "Ustrd").Select(e => e.Value.Trim()).Where(t => t.Length > 0));
        var description = (unstructured.Length > 0 ? unstructured : null)
            ?? Text(detail, "RmtInf", "Strd", "CdtrRefInf", "Ref")
            ?? Text(detail, "AddtlTxInf")
            ?? Text(entry, "AddtlNtryInf");
        description = description?[..Math.Min(description.Length, ParsedStatement.DescriptionMaxLength)];

        var reference = new[]
            {
                Text(detail, "Refs", "AcctSvcrRef"),
                Text(entry, "AcctSvcrRef") is { } serviced ? serviced + suffix : null,
                Text(entry, "NtryRef") is { } entryRef ? entryRef + suffix : null,
                Text(detail, "Refs", "EndToEndId"),
            }
            .FirstOrDefault(r => r is not null && !r.StartsWith("NOTPROVIDED", StringComparison.Ordinal));
        if (reference is not { Length: <= ImportReferences.MaxLength })
        {
            reference = ImportReferences.Hash($"{date:yyyy-MM-dd}|{amount.ToString(CultureInfo.InvariantCulture)}|{type}|{counterpartyIban}|{description}|{suffix}");
        }

        return new ParsedRow(
            reference,
            date,
            payee,
            description,
            amount,
            type,
            currency,
            counterpartyIban,
            Text(entry, "RvslInd") is "true" or "1");
    }

    private static string? IbanOf(XElement statement) => Iban.Normalize(Text(statement, "Acct", "Id", "IBAN"));

    private static decimal? Amount(XElement? parent) => DecimalRules.ParseMoneyText(Text(parent, "Amt"));

    private static Currency? CurrencyOf(XElement? parent) =>
        CurrencyCode.TryParse(Find(parent, "Amt")?.Attribute("Ccy")?.Value, out var currency) ? currency : null;

    private static DateOnly? Date(XElement? parent, TimeZoneInfo timeZone)
    {
        if (DateOnly.TryParseExact(Text(parent, "Dt"), DateFormats.IsoDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return date;
        }

        var text = Text(parent, "DtTm");
        if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var local)
            && local.Kind == DateTimeKind.Unspecified)
        {
            return DateOnly.FromDateTime(local);
        }

        return DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var moment)
            ? DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(moment, timeZone).DateTime)
            : null;
    }

    private static XElement? Find(XElement? element, params string[] path)
    {
        foreach (var name in path)
        {
            element = element?.Element(element.Name.Namespace + name);
        }

        return element;
    }

    private static IEnumerable<XElement> Children(XElement? element, string name) =>
        element?.Elements(element.Name.Namespace + name) ?? [];

    private static string? Text(XElement? element, params string[] path) =>
        Find(element, path)?.Value.Trim() is { Length: > 0 } value ? value : null;

    private static DomainError Invalid() => new(
        ErrorCodes.ImportInvalidFile,
        "The file is not a camt.053 bank statement in ISO 20022 XML.");
}
