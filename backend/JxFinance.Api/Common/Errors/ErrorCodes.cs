using System.Reflection;

namespace JxFinance.Common.Errors;

public static class ErrorCodes
{
    public const string Required = "required";
    public const string TextTooLong = "text.tooLong";
    public const string TextTooShort = "text.tooShort";
    public const string TextInvalidFormat = "text.invalidFormat";
    public const string EmailInvalid = "email.invalid";
    public const string EmailTaken = "email.taken";
    public const string IbanInvalid = "iban.invalid";
    public const string DecimalMalformed = "decimal.malformed";
    public const string MoneyInvalid = "money.invalid";
    public const string MoneyPositive = "money.positive";
    public const string MoneyNonNegative = "money.nonNegative";
    public const string QuantityPositive = "quantity.positive";
    public const string QuantityNonNegative = "quantity.nonNegative";
    public const string RangeInvalid = "range.invalid";
    public const string EnumInvalid = "enum.invalid";
    public const string CollectionInvalidSize = "collection.invalidSize";
    public const string ValueMustDiffer = "value.mustDiffer";
    public const string ValueMustBeEmpty = "value.mustBeEmpty";
    public const string ValueLocked = "value.locked";
    public const string RequestMalformed = "request.malformed";
    public const string RequestInvalid = "request.invalid";
    public const string ReferenceNotFound = "reference.notFound";
    public const string ResourceNotFound = "resource.notFound";
    public const string ResourceReadOnly = "resource.readOnly";
    public const string ConflictDuplicate = "conflict.duplicate";
    public const string ConflictStale = "conflict.stale";
    public const string ConflictBusy = "conflict.busy";
    public const string AccessForbidden = "access.forbidden";
    public const string CredentialsInvalid = "credentials.invalid";
    public const string CredentialsLockedOut = "credentials.lockedOut";
    public const string PasswordIncorrect = "password.incorrect";
    public const string PasswordTooWeak = "password.tooWeak";
    public const string TwoFactorInvalidCode = "twoFactor.invalidCode";
    public const string SessionCurrent = "session.current";
    public const string SetupAlreadyCompleted = "setup.alreadyCompleted";
    public const string FeatureDisabled = "feature.disabled";
    public const string UserSelfChange = "user.selfChange";
    public const string UserLastAdministrator = "user.lastAdministrator";
    public const string HouseholdRequired = "household.required";
    public const string HouseholdNotMember = "household.notMember";
    public const string HouseholdLastOwner = "household.lastOwner";
    public const string HouseholdScopeMismatch = "household.scopeMismatch";
    public const string CategoryWrongType = "category.wrongType";
    public const string CurrencyDisabled = "currency.disabled";
    public const string ExchangeRateUnavailable = "exchangeRate.unavailable";
    public const string TransferSameAccount = "transfer.sameAccount";
    public const string TransferReceivedAmountRequired = "transfer.receivedAmountRequired";
    public const string TransferAmountMismatch = "transfer.amountMismatch";
    public const string TransactionLinesMismatch = "transaction.linesMismatch";
    public const string TransactionSplitNotAllowed = "transaction.splitNotAllowed";
    public const string RecurringBillInactive = "recurringBill.inactive";
    public const string HoldingOversold = "holding.oversold";
    public const string HoldingDependentSales = "holding.dependentSales";
    public const string SecurityNotHeld = "security.notHeld";
    public const string ImportInvalidFile = "import.invalidFile";
    public const string ImportTransferMismatch = "import.transferMismatch";
    public const string ImportTransferAlreadyMatched = "import.transferAlreadyMatched";
    public const string RestoreExpired = "restore.expired";
    public const string RestoreReferenceMissing = "restore.referenceMissing";
    public const string RestoreCompanionDeleted = "restore.companionDeleted";
    public const string RestoreDetailsLost = "restore.detailsLost";
    public const string RestoreSlotTaken = "restore.slotTaken";
    public const string ExportTooManyRows = "export.tooManyRows";
    public const string BackupInvalidFile = "backup.invalidFile";
    public const string BackupSchemaMismatch = "backup.schemaMismatch";
    public const string BackupTooLarge = "backup.tooLarge";
    public const string BrokerUnavailable = "broker.unavailable";
    public const string BrokerRejected = "broker.rejected";
    public const string BrokerTokenRequired = "broker.tokenRequired";
    public const string EmailNotConfigured = "email.notConfigured";
    public const string EmailPasswordUnreadable = "email.passwordUnreadable";
    public const string EmailSendFailed = "email.sendFailed";
    public const string EmailAlreadyVerified = "email.alreadyVerified";
    public const string EmailTokenInvalid = "email.tokenInvalid";
    public const string PasswordResetTokenInvalid = "passwordReset.tokenInvalid";

    public static IReadOnlyList<string> All { get; } = typeof(ErrorCodes)
        .GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(field => field is { IsLiteral: true, IsInitOnly: false } && field.FieldType == typeof(string))
        .Select(field => (string)field.GetRawConstantValue()!)
        .Order(StringComparer.Ordinal)
        .ToList();

    public static bool IsKnown(string? errorCode) => errorCode is not null && All.Contains(errorCode, StringComparer.Ordinal);

    public static int StatusCodeFor(string? errorCode) => errorCode switch
    {
        ResourceNotFound or FeatureDisabled => StatusCodes.Status404NotFound,
        ConflictDuplicate or ConflictStale or ConflictBusy or SetupAlreadyCompleted or RestoreSlotTaken => StatusCodes.Status409Conflict,
        AccessForbidden or UserSelfChange or UserLastAdministrator or SecurityNotHeld or SessionCurrent => StatusCodes.Status403Forbidden,
        CredentialsInvalid => StatusCodes.Status401Unauthorized,
        CredentialsLockedOut => StatusCodes.Status429TooManyRequests,
        _ => StatusCodes.Status400BadRequest,
    };
}
