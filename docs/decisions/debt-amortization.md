# Debt amortization: decisions

Related: feature page [Debt amortization](../features/debt-amortization.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-21.** A debt's repayment terms describe the loan from its start: loan amount, first payment date, and a term or a fixed monthly payment (never both), annuity or linear, all optional; payments are monthly only
  - Rejected: Starting the schedule from the current outstanding amount and its date; storing both a term and a payment; a payment frequency field
  - Why: The contract states the original principal and the first payment, and a schedule from the start is what makes "payments made" and "scheduled balance today" meaningful. Deriving one of term and payment from the other avoids two numbers that can disagree. Every loan a household here holds is paid monthly, and a frequency would turn the term into a number of payments for no present use
- **2026-09-21.** The schedule is computed on every request by a pure `decimal` calculator and never stored; a payment that would take more than 600 months is refused with `debt.paymentTooSmall` at save time and by the calculator
  - Rejected: A stored schedule table; computing in the browser; `double` arithmetic
  - Why: At most 600 rows is cheap to compute and a stored copy would need rewriting on every change of terms. One server calculator keeps the numbers the API documents identical to the ones the page shows. Money in `double` drifts by cents over 360 payments
- **2026-09-21.** Every interest amount and the level payment are rounded to cents half away from zero, the monthly rate is the annual rate over 12 whatever the month, and the last payment absorbs the rounding
  - Rejected: Keeping fractional cents until the end; rounding the payment up so the last one is never larger; actual-day interest
  - Why: Rounding each row is what a statement shows, and letting the last payment take the remainder makes principal sum to exactly the loan. Rounding up would disagree with the payment most lenders quote (536.82, not 536.83, for the textbook mortgage). Day counts differ per bank and would add cents of precision to a planning tool
- **2026-09-21.** Overpayments keep the payment and shorten the term; a lump sum is paid with the first scheduled payment on or after its date
  - Rejected: Lowering the payment and keeping the term; applying a lump sum on its own date between payments
  - Why: Shortening is what "pay off sooner" means and what lenders do unless asked otherwise. Paying on the next scheduled date keeps every row on the payment calendar and interest on whole months
- **2026-09-21.** The recorded outstanding amount stays what the owner entered and is what net worth subtracts; the schedule's balance for today is shown beside it and copied only by "Use scheduled balance"
  - Rejected: Replacing the outstanding amount with the scheduled balance automatically; a background job that updates it monthly
  - Why: Real balances diverge from the contract (overpayments, rate changes, payment holidays), and an automatic rewrite would also change net worth figures already snapshotted. An explicit button keeps the choice with the owner and is an ordinary, undoable-by-editing update
- **2026-09-21.** The overpayment amounts of the schedule request are query strings parsed with the invariant culture
  - Rejected: Number query parameters bound by the framework
  - Why: Every other money value in the API is a dot-decimal string, and a string cannot be misread under a server culture that uses a comma
