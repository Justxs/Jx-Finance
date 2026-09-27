# Transfers: decisions

Related: feature page [Transfers](../features/transfers.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-19.** A transfer with an import receipt keeps its date, the receipt's account on its side and the amount on that side; everything else can be edited
  - Rejected: Refusing every edit of an imported transfer; allowing every edit
  - Why: The receipt exists so the same bank entry is not imported twice and so the transfer keeps describing that entry. The funding account of a broker deposit and the description are not on the receipt, and being able to correct them is the reason to edit such a transfer at all
