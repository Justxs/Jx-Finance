using JxFinance.Common.Validation;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.CreateContactSplit;

public sealed class CreateContactSplitValidator : ContactSplitInputValidator<CreateContactSplitRequest>
{
    public CreateContactSplitValidator()
    {
        RuleFor(r => r.TransactionId).IsRequired();
    }
}
