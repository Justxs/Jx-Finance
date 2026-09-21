using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Trash.RestoreDeleted;

public sealed class RestoreDeletedValidator : Validator<RestoreDeletedRequest>
{
    public RestoreDeletedValidator()
    {
        RuleFor(r => r.Kind).IsKnownEnum();
        RuleFor(r => r.EntityId).IsRequired();
    }
}
