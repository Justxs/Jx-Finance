using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Domain.Contacts;

namespace JxFinance.Endpoints.Contacts.CreateContactPayment;

public sealed class CreateContactPaymentValidator : Validator<CreateContactPaymentRequest>
{
    public CreateContactPaymentValidator()
    {
        RuleFor(r => r.Direction).IsKnownEnum();
        RuleFor(r => r.Amount).IsPositiveMoney();
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Date).IsRequired();
        RuleFor(r => r.Note).HasMaxLength(ContactPayment.NoteMaxLength);
    }
}
