using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Imports.Parsing;

public enum StatementFormat
{
    SwedbankCsv,
    Camt053,
    GenericCsv,
}

public sealed record ParsedStatement(
    IReadOnlyList<ParsedRow> Rows,
    string? Iban = null,
    DateOnly? ClosingDate = null,
    Money? ClosingBalance = null,
    int NotBooked = 0,
    int Unreadable = 0)
{
    public const int MaxRows = 10000;
    public const int DescriptionMaxLength = 500;
}

public sealed record ParsedRow(
    string ImportRef,
    DateOnly Date,
    string? Payee,
    string? Description,
    decimal Amount,
    FlowType Type,
    Currency Currency,
    string? CounterpartyIban = null,
    bool IsReversal = false);
