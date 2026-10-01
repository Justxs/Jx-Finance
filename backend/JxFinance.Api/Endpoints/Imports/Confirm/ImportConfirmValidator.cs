using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.TransactionGroups.Shared;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmValidator : Validator<ImportConfirmRequest>
{
    public ImportConfirmValidator()
    {
        RuleFor(r => r.AccountId).IsRequired();
        RuleFor(r => r.Format).IsKnownEnum();
        RuleFor(r => r.MappingId).IsPresent().When(r => r.Format == StatementFormat.GenericCsv);
        RuleFor(r => r.Rows)
            .IsPresent()
            .Must(rows => rows is { Count: > 0 and <= 10000 })
            .WithErrorCode(ErrorCodes.CollectionInvalidSize);
        RuleForEach(r => r.Rows).ChildRules(row =>
        {
            row.RuleFor(r => r.ImportRef).IsRequired().HasMaxLength(64);
            row.RuleFor(r => r.Date).IsRequired();
            row.RuleFor(r => r.Type).IsKnownEnum();
            row.RuleFor(r => r.Currency).IsKnownEnum();
            row.RuleFor(r => r.Description).HasMaxLength(500);
            row.RuleFor(r => r.Payee).HasMaxLength(TransactionPayee.MaxLength);
            row.RuleFor(r => r.Amount).IsPositiveMoney();
            row.RuleFor(r => r.TagIds).HasAtMostTags();
            row.RuleFor(r => r.SpreadMonths).IsWithin(TransactionSpread.MinMonths, TransactionSpread.MaxMonths);
            row.RuleFor(r => r.SpreadDirection).IsKnownEnum();
            row.RuleFor(r => r.SpreadMonths)
                .IsAbsent()
                .WithMessage("Only a row recorded as a transaction can be spread over months.")
                .When(r => r.TransferAccountId is not null || r.ExistingTransferId is not null || r.ExistingTransactionId is not null);
            row.RuleFor(r => r)
                .Must(r => r.AsRefund
                    ? r is { Type: FlowType.Income, TransferAccountId: null, ExistingTransferId: null, ExistingTransactionId: null }
                    : r.RefundOfTransactionId is null)
                .WithErrorCode(ErrorCodes.ImportRefundInvalid)
                .WithMessage("Only an incoming row recorded as a transaction can be a refund, and only a refund can name the purchase it refunds.")
                .WithName(nameof(ImportConfirmRow.AsRefund));
        });
        RuleFor(r => r.Statement!).ChildRules(statement =>
        {
            statement.RuleFor(s => s.ClosingDate).IsRequired();
            statement.RuleFor(s => s.ClosingBalance).IsMoney();
            statement.RuleFor(s => s.ClosingCurrency).IsKnownEnum();
        });
        RuleFor(r => r.Group!).ChildRules(group =>
        {
            group.RuleFor(g => g.Name).IsGroupName().When(g => g.Id is null);
            group.RuleFor(g => g.Name)
                .IsAbsent()
                .WithMessage("Name a new group or choose an existing one, not both.")
                .When(g => g.Id is not null);
        });
    }
}
