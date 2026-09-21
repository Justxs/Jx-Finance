using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Amortization;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.Shared;

public abstract class DebtInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IDebtInput
{
    protected DebtInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.OutstandingAmount)
            .IsPresent()
            .WithMessage("Outstanding amount is required.")
            .IsNonNegativeMoney()
            .WithMessage("Outstanding amount must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.InterestRate).IsWithin(0, 100).When(r => r.InterestRate.HasValue);
        RuleFor(r => r.AsOf).IsRequired();
        RuleFor(r => r.LoanAmount)
            .IsPositiveMoney()
            .WithMessage("Loan amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.TermMonths).IsWithin(1, Debt.MaxTermMonths).When(r => r.TermMonths.HasValue);
        RuleFor(r => r.AmortizationType).IsKnownEnum().When(r => r.AmortizationType.HasValue);
        RuleFor(r => r.MonthlyPayment)
            .IsPositiveMoney()
            .WithMessage("Monthly payment must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.MonthlyPayment)
            .IsAbsent()
            .WithMessage("Give either a term or a monthly payment, not both.")
            .When(r => r.TermMonths.HasValue);
        RuleFor(r => r.MonthlyPayment)
            .IsAbsent()
            .WithMessage("A linear schedule is set by its term; leave the monthly payment empty.")
            .When(r => r.AmortizationType == AmortizationType.Linear && !r.TermMonths.HasValue);
        RuleFor(r => r.MonthlyPayment)
            .Must((request, _) => Repays(request))
            .WithErrorCode(ErrorCodes.DebtPaymentTooSmall)
            .WithMessage(AmortizationCalculator.PaymentTooSmallMessage);
    }

    private static bool Repays(TRequest request)
    {
        if (request is not
            {
                LoanAmount: > 0 and var principal,
                InterestRate: >= 0 and <= 100 and var rate,
                MonthlyPayment: > 0 and var payment,
                TermMonths: null,
                AmortizationType: null or AmortizationType.Annuity,
            }
            || !DecimalRules.FitsMoney(principal)
            || !DecimalRules.FitsMoney(payment))
        {
            return true;
        }

        var terms = new AmortizationTerms(principal, rate, request.FirstPaymentDate ?? request.AsOf, null, payment);
        return AmortizationCalculator.Calculate(terms).IsSuccess;
    }
}
