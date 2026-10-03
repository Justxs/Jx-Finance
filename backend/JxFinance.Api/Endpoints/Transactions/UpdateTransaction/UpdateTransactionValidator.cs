using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.UpdateTransaction;

public sealed class UpdateTransactionValidator : TransactionInputValidator<UpdateTransactionRequest>
{
    public UpdateTransactionValidator()
    {
        RuleFor(r => r.Version).IsReadVersion();
    }
}
