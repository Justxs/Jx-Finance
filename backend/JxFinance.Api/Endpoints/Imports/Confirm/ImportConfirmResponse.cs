using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed record ImportConfirmResponse(int Imported, int SkippedDuplicates, int Linked, ReconciliationResponse? Reconciliation);
