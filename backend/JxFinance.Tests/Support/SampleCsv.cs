using System.Text;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;

namespace JxFinance.Tests.Support;

public static class SampleCsv
{
    public const string Revolut = """
        Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
        CARD_PAYMENT,Current,2026-09-01 10:15:02,2026-09-02 08:01:44,Lidl,-15.77,0.00,EUR,COMPLETED,984.23
        CARD_PAYMENT,Current,2026-09-03 12:00:00,2026-09-03 12:00:05,Coffee,-3.50,0.00,EUR,COMPLETED,980.73
        TOPUP,Current,2026-09-04 09:00:00,2026-09-04 09:00:01,Top-up by *1234,500.00,0.00,EUR,COMPLETED,1480.73
        ATM,Current,2026-09-05 18:30:00,2026-09-05 18:30:02,Cash at Vilnius,-10.00,0.50,EUR,COMPLETED,1470.23
        CARD_PAYMENT,Current,2026-09-06 20:00:00,,Pending shop,-7.00,0.00,EUR,PENDING,
        CARD_PAYMENT,Current,2026-09-06 21:00:00,2026-09-06 21:00:01,Netflix,-9.99,0.00,USD,COMPLETED,40.01
        """;

    public const string Wise = """
        "TransferWise ID",Date,Amount,Currency,Description,"Running Balance","Payee Name","Total fees"
        TRANSFER-1001,01-09-2026,-25.00,EUR,"Sent money to Jonas",975.00,Jonas,0.00
        CARD-2002,02-09-2026,-12.40,EUR,"Card transaction of 12.40 EUR issued by Maxima",962.60,,0.00
        TRANSFER-1003,03-09-2026,300.00,EUR,"Received money from Employer",1262.60,,0.00
        """;

    public const string CardStatement = """
        Card statement;SEB Mastercard
        Card number;**** 4421
        Period;2026-09-01 - 2026-09-30

        Date;Merchant;Amount;Balance
        2026-09-30;Payment - thank you;-150,00;50,00
        2026-09-12;Refund Zara;-19,99;200,00
        2026-09-05;Zara;49,99;219,99
        2026-09-02;Maxima;170,00;170,00
        Total;;;
        """;

    public const string Lithuanian = """
        Data;Paaiškinimas;Gavėjas;Debetas;Kreditas
        01.09.2026;Pirkinys ąčęėįšųūž;Žalgirio arena;1 234,56;
        02.09.2026;Atlyginimas;Įmonė UAB;;2 000,00
        03.09.2026;Klaida;;5,00;5,00
        """;

    public static CsvImportMapping RevolutMapping => new()
    {
        Name = "Revolut",
        Delimiter = ",",
        DateFormat = "yyyy-MM-dd",
        AmountStyle = CsvAmountStyle.SignedNegativeIsExpense,
        Columns = new CsvColumnMap
        {
            Date = "Completed Date",
            Description = "Description",
            Amount = "Amount",
            Fee = "Fee",
            Currency = "Currency",
            Balance = "Balance",
            Status = "State",
            BookedValues = "COMPLETED",
        },
    };

    public static CsvImportMapping WiseMapping => new()
    {
        Name = "Wise",
        Delimiter = ",",
        DateFormat = "dd-MM-yyyy",
        AmountStyle = CsvAmountStyle.SignedNegativeIsExpense,
        Columns = new CsvColumnMap
        {
            Date = "Date",
            Description = "Description",
            Payee = "Payee Name",
            Amount = "Amount",
            Currency = "Currency",
            Reference = "TransferWise ID",
            Balance = "Running Balance",
        },
    };

    public static CsvImportMapping CardMapping => new()
    {
        Name = "SEB card",
        Delimiter = ";",
        SkipLines = 3,
        DateFormat = "yyyy-MM-dd",
        DecimalSeparator = CsvDecimalSeparator.Comma,
        AmountStyle = CsvAmountStyle.SignedPositiveIsExpense,
        Columns = new CsvColumnMap { Date = "Date", Description = "Merchant", Amount = "Amount", Balance = "Balance" },
    };

    public static CsvImportMapping LithuanianMapping => new()
    {
        Name = "Senas bankas",
        Encoding = CsvEncoding.Windows1257,
        Delimiter = ";",
        DateFormat = "dd.MM.yyyy",
        DecimalSeparator = CsvDecimalSeparator.Comma,
        AmountStyle = CsvAmountStyle.DebitCredit,
        Currency = Currency.Eur,
        Columns = new CsvColumnMap { Date = "Data", Description = "Paaiškinimas", Payee = "Gavėjas", Debit = "Debetas", Credit = "Kreditas" },
    };

    public static object RevolutBody(string name = "Revolut", string amountStyle = "signedNegativeIsExpense", string dateFormat = "yyyy-MM-dd") => new
    {
        name,
        encoding = "utf8",
        delimiter = ",",
        skipLines = 0,
        amountStyle,
        dateFormat,
        decimalSeparator = "dot",
        columns = new
        {
            date = "Completed Date",
            description = "Description",
            amount = "Amount",
            fee = "Fee",
            currency = "Currency",
            balance = "Balance",
            status = "State",
            bookedValues = "COMPLETED",
        },
    };

    public static byte[] Windows1257(string text) =>
        CodePagesEncodingProvider.Instance.GetEncoding(1257)!.GetBytes(text);

    public static byte[] Utf8(string text) => Encoding.UTF8.GetBytes(text);
}
