using JxFinance.Domain.Accounts;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.Mappers;

public static class ReconciliationMapper
{
    public static ReconciliationResponse ToResponse(this AccountReconciliation reconciliation, decimal ledgerBalance) => new(
        reconciliation.Id.Value,
        reconciliation.Date,
        reconciliation.Balance.Amount,
        reconciliation.Balance.Currency,
        reconciliation.Source,
        ledgerBalance,
        reconciliation.Balance.Amount - ledgerBalance,
        reconciliation.CreatedAt);
}
