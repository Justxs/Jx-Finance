using FastEndpoints;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.CreateContact;

public sealed class CreateContactValidator : Validator<CreateContactRequest>
{
    public CreateContactValidator()
    {
        RuleFor(r => r.Name).IsContactName();
    }
}
