using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Common.Amortization;

public static class AmortizationCalculator
{
    public const string PaymentTooSmallMessage =
        "The monthly payment does not repay the debt within 50 years; it has to be more than the first month's interest.";

    public static decimal MonthlyRate(decimal annualRatePercent) => annualRatePercent / 1200m;

    public static decimal LevelPayment(decimal principal, decimal annualRatePercent, int termMonths)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(termMonths, 1);
        var rate = MonthlyRate(annualRatePercent);
        if (rate == 0)
        {
            return Money.Round(principal / termMonths);
        }

        var growth = Power(1 + rate, termMonths);
        return Money.Round(principal * (rate * growth / (growth - 1)));
    }

    public static Result<AmortizationSchedule> Calculate(AmortizationTerms terms) => Calculate(terms, ExtraPayments.None);

    public static Result<AmortizationSchedule> Calculate(AmortizationTerms terms, ExtraPayments extra)
    {
        Validate(terms, extra);

        var rate = MonthlyRate(terms.AnnualRatePercent);
        var regular = RegularAmount(terms);
        if (terms.TermMonths is null && regular <= Money.Round(terms.Principal * rate))
        {
            return PaymentTooSmall();
        }

        var rows = new List<AmortizationRow>();
        var balance = terms.Principal;
        var lumpSumPending = extra.LumpSum > 0;
        for (var number = 1; balance > 0; number++)
        {
            if (number > Debt.MaxTermMonths)
            {
                return PaymentTooSmall();
            }

            var date = terms.FirstPaymentDate.AddMonths(number - 1);
            var interest = Money.Round(balance * rate);
            var principal = Math.Max(0, terms.Type == AmortizationType.Annuity ? regular - interest : regular);
            if (principal >= balance || number == terms.TermMonths)
            {
                principal = balance;
            }

            var extraAmount = extra.Monthly;
            if (lumpSumPending && date >= extra.LumpSumDate!.Value)
            {
                extraAmount += extra.LumpSum;
                lumpSumPending = false;
            }

            extraAmount = Math.Min(extraAmount, balance - principal);
            balance -= principal + extraAmount;
            rows.Add(new AmortizationRow(number, date, interest + principal, interest, principal, extraAmount, balance));
        }

        return new AmortizationSchedule(terms.Principal, rows[0].Payment, rows);
    }

    private static decimal RegularAmount(AmortizationTerms terms) => (terms.Type, terms.TermMonths) switch
    {
        (AmortizationType.Linear, { } termMonths) => Money.Round(terms.Principal / termMonths),
        (_, { } termMonths) => LevelPayment(terms.Principal, terms.AnnualRatePercent, termMonths),
        _ => terms.Payment!.Value,
    };

    private static void Validate(AmortizationTerms terms, ExtraPayments extra)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(terms.Principal);
        ArgumentOutOfRangeException.ThrowIfNegative(terms.AnnualRatePercent);
        ArgumentOutOfRangeException.ThrowIfNegative(extra.Monthly);
        ArgumentOutOfRangeException.ThrowIfNegative(extra.LumpSum);
        if (terms.TermMonths is { } termMonths)
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(termMonths, 1);
            ArgumentOutOfRangeException.ThrowIfGreaterThan(termMonths, Debt.MaxTermMonths);
        }
        else if (terms.Type == AmortizationType.Linear || terms.Payment is not > 0)
        {
            throw new ArgumentException("A linear schedule needs a term; an annuity needs a term or a positive payment.", nameof(terms));
        }

        if (extra.LumpSum > 0 && extra.LumpSumDate is null)
        {
            throw new ArgumentException("A lump sum needs a date.", nameof(extra));
        }
    }

    private static Result<AmortizationSchedule> PaymentTooSmall() =>
        Result<AmortizationSchedule>.Failure(ErrorCodes.DebtPaymentTooSmall, PaymentTooSmallMessage);

    private static decimal Power(decimal value, int exponent)
    {
        var result = 1m;
        while (exponent > 0)
        {
            if ((exponent & 1) == 1)
            {
                result *= value;
            }

            exponent >>= 1;
            if (exponent > 0)
            {
                value *= value;
            }
        }

        return result;
    }
}
