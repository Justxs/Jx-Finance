using FastEndpoints;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.UpdateContact;

public sealed class UpdateContactValidator : Validator<UpdateContactRequest>
{
    public UpdateContactValidator()
    {
        RuleFor(r => r.Name).IsContactName();
    }
}
