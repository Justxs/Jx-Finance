using JxFinance.Domain.Accounts;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.Mappers;

public static class ReconciliationMapper
{
    public static ReconciliationResponse ToResponse(this AccountReconciliation reconciliation, decimal ledgerBalance) => new(
        reconciliation.Id.Value,
        reconciliation.Date,
        reconciliation.Balance,
        reconciliation.Currency,
        reconciliation.Source,
        ledgerBalance,
        reconciliation.Balance - ledgerBalance,
        reconciliation.CreatedAt);
}
