# Debt amortization: decisions

Related: feature page [Debt amortization](../features/debt-amortization.md).

## Current

The schedule is computed on every request by a pure `decimal` calculator and never stored; a payment that would take more than 600 months is refused with `debt.paymentTooSmall`. Every interest amount and the level payment are rounded to cents half away from zero, the monthly rate is the annual rate over 12 whatever the month, and the last payment absorbs the rounding. A lump sum is paid with the first scheduled payment on or after its date, and the overpayment amounts are query strings read with the invariant culture. The recorded outstanding amount is what net worth subtracts, unless the debt tracks payments; the schedule's balance for today is shown beside it and copied only by "Use scheduled balance"

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

Older entries are in the git history of this file (`git log -p -- docs/decisions/debt-amortization.md`).

- **2026-10-01.** The schedule answers both uses of an overpayment in one response: `withExtra` keeps the payment and shortens the term, and `lowerPayment` keeps the number of payments and recomputes the payment for the payments left after every payment that carries an overpayment, a new level payment for an annuity and a new principal part for a linear loan, rounded to cents with the last payment absorbing the remainder. A recurring extra each month is an overpayment every month, so it lowers the payment every month. `lowerPayment` is a summary (new payment, from when, what it replaces, payoff date, interest saved) without rows, and the table and charts keep showing the shorter-term plan. Decided while the owner was away, to be reviewed
  - Rejected: A `mode` query parameter (`shortenTerm` or `lowerPayment`) choosing one preview; offering the lower payment for the one-off payment only; recomputing only after the one-off payment while the monthly extra kept shortening the term; returning the rows of the lower-payment plan
  - Why: Side by side is the comparison a borrower makes at the bank, and one request avoids a second round trip and a second wait after typing. One rule for both inputs keeps the comparison like for like, the same overpayments under each choice, where a monthly extra that shortened the term inside the lower-payment column would mix the two. Rows nobody draws would double the response for nothing
- **2026-09-30.** A payment link is visible when its debt is, through a query filter of its own, and unlinking removes it through the change tracker, so it is soft-deleted and purged with the trash after 30 days instead of hard-deleted
  - Rejected: Keeping the owner filter on the linker; unlinking with `ExecuteDelete`
  - Why: A shared debt must show every member the same links and balance. A bulk delete bypasses the change tracker, so the household activity log could not see the unlink
- **2026-09-27.** A debt that tracks payments derives its balance on read: the recorded amount on its as-of date is the anchor, minus the principal of the linked payments dated after it; editing the amount or date sets a new anchor
  - Rejected: Lowering the outstanding amount on every linked payment, kept in step on transaction update, delete, restore and import
  - Why: Derivation makes edits, deletes, trash restores and a housemate's change to a shared-account row correct with no hooks at all. The conversion-fee precedent shows how many places a stored side effect has to be kept in step
- **2026-09-27.** Each link has a kind: a regular payment pays round(balance before × rate / 12) of interest first and the rest is principal, an extra payment is all principal, and a principal typed from the bank statement overrides both; no rate or a zero rate makes everything principal
  - Rejected: Reducing the balance by the full amount; reading the contract schedule's row
  - Why: The full amount overstates repayment by the interest. The schedule assumes the contract balance, not the real one, and AmortizationCalculator.MonthlyRate already gives the monthly rate
- **2026-09-27.** Recurring confirmations link a regular payment; a manual link is regular unless a regular payment already falls in that calendar month, then extra
  - Rejected: Always asking
  - Why: Right in the common case, and the kind is editable on the link
- **2026-09-27.** Only unsplit expense transactions on any account the owner can see, and expense recurring entries, can pay a debt
  - Rejected: Transfers to an "Other" account standing for the loan; split lines
  - Why: The loan account would count in net worth next to the debt, so it would be counted twice. A line id is replaced on every edit, so it is no stable target
- **2026-09-27.** The link is a DebtPayment row owned by the debt's owner and pointing at the transaction, unique per transaction, removed by a cascade when either side is purged and hard-deleted when unlinked
  - Rejected: A DebtId column on Transaction
  - Why: Debts are personal, but a transaction on a shared account is editable by housemates; a column on it would let their edit form see or change the link. A row under the owner filter cannot be touched by them
- **2026-09-27.** A linked payment stays a whole expense in reports and budgets
  - Rejected: Counting the principal as savings
  - Why: A separate question with its own consequences for budgets
- **2026-09-27.** A payment in another currency than the debt's is converted at the rate of its date; a missing rate leaves it out and marks the balance, and net worth, incomplete, so no snapshot is written
  - Rejected: Refusing the link
  - Why: The same rule as everywhere else. A euro debt paid from a euro account never needs a rate
- **2026-09-21.** A debt's repayment terms describe the loan from its start: loan amount, first payment date, and a term or a fixed monthly payment (never both), annuity or linear, all optional; payments are monthly only
  - Rejected: Starting the schedule from the current outstanding amount and its date; storing both a term and a payment; a payment frequency field
  - Why: The contract states the original principal and the first payment, and a schedule from the start is what makes "payments made" and "scheduled balance today" meaningful. Deriving one of term and payment from the other avoids two numbers that can disagree. Every loan a household here holds is paid monthly, and a frequency would turn the term into a number of payments for no present use
