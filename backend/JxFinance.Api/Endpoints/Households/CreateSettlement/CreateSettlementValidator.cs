using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households.CreateSettlement;

public sealed class CreateSettlementValidator : Validator<CreateSettlementRequest>
{
    public CreateSettlementValidator()
    {
        RuleFor(r => r.FromUserId).IsRequired();
        RuleFor(r => r.ToUserId)
            .IsRequired()
            .NotEqual(r => r.FromUserId)
            .WithErrorCode(ErrorCodes.SettleUpSamePerson)
            .WithMessage("A payment needs two different members.");
        RuleFor(r => r.Amount).IsPositiveMoney();
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Date).IsRequired();
        RuleFor(r => r.Note).HasMaxLength(Settlement.NoteMaxLength);
        RuleFor(r => r.TransferId).IsAbsent().When(r => r.Transfer is not null);
        RuleFor(r => r.Transfer!.FromAccountId).IsRequired().When(r => r.Transfer is not null);
        RuleFor(r => r.Transfer!.ToAccountId)
            .IsRequired()
            .NotEqual(r => r.Transfer!.FromAccountId)
            .WithErrorCode(ErrorCodes.TransferSameAccount)
            .When(r => r.Transfer is not null);
    }
}
