using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.Contacts;

namespace JxFinance.Endpoints.Contacts.Shared;

public static class ContactNameRules
{
    public static IRuleBuilderOptions<T, string?> IsContactName<T>(this IRuleBuilder<T, string?> rule) =>
        rule.IsRequired().HasMaxLength(Contact.NameMaxLength);
}
