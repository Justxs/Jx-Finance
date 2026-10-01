using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions.RenamePlace;

public sealed class RenamePlaceValidator : Validator<RenamePlaceRequest>
{
    public RenamePlaceValidator()
    {
        RuleFor(r => r.Places)
            .IsRequired()
            .Must(places => places is null || places.Count <= RenamePlaceRequest.MaxPlaces)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"At most {RenamePlaceRequest.MaxPlaces} places can be merged at once.");
        RuleForEach(r => r.Places).IsRequired().HasMaxLength(TransactionPlace.MaxLength);
        RuleFor(r => r.Name).IsRequired().HasMaxLength(TransactionPlace.MaxLength);
    }
}
