using System.Collections.Frozen;
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
    public const string MoneyNonZero = "money.nonZero";
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
    public const string TwoFactorAlreadyEnabled = "twoFactor.alreadyEnabled";
    public const string SessionCurrent = "session.current";
    public const string PasskeyInvalid = "passkey.invalid";
    public const string PasskeyStateInvalid = "passkey.stateInvalid";
    public const string PasskeyLimitReached = "passkey.limitReached";
    public const string PasskeyUnavailable = "passkey.unavailable";
    public const string TokenInvalid = "token.invalid";
    public const string TokenNotAllowed = "token.notAllowed";
    public const string TokenLimitReached = "token.limitReached";
    public const string TokenRateLimited = "token.rateLimited";
    public const string IdempotencyKeyReused = "idempotency.keyReused";
    public const string SetupAlreadyCompleted = "setup.alreadyCompleted";
    public const string FeatureDisabled = "feature.disabled";
    public const string UserSelfChange = "user.selfChange";
    public const string UserLastAdministrator = "user.lastAdministrator";
    public const string HouseholdRequired = "household.required";
    public const string HouseholdNotMember = "household.notMember";
    public const string HouseholdLastOwner = "household.lastOwner";
    public const string HouseholdScopeMismatch = "household.scopeMismatch";
    public const string HouseholdReferenceNotShared = "household.referenceNotShared";
    public const string SettleUpNotPayer = "settleUp.notPayer";
    public const string SettleUpNotExpense = "settleUp.notExpense";
    public const string SettleUpAlreadySplit = "settleUp.alreadySplit";
    public const string SettleUpNoOtherMember = "settleUp.noOtherMember";
    public const string SettleUpSharesMismatch = "settleUp.sharesMismatch";
    public const string SettleUpSamePerson = "settleUp.samePerson";
    public const string SettleUpAccountOwner = "settleUp.accountOwner";
    public const string SettleUpCurrencyMismatch = "settleUp.currencyMismatch";
    public const string SettleUpTransferTaken = "settleUp.transferTaken";
    public const string ContactNoPerson = "contact.noPerson";
    public const string CategoryWrongType = "category.wrongType";
    public const string CategoryNestingInvalid = "category.nestingInvalid";
    public const string CurrencyDisabled = "currency.disabled";
    public const string ExchangeRateUnavailable = "exchangeRate.unavailable";
    public const string ExchangeRateNotPositive = "exchangeRate.notPositive";
    public const string ExchangeRateUnsupportedCurrency = "exchangeRate.unsupportedCurrency";
    public const string ExchangeRateFutureDate = "exchangeRate.futureDate";
    public const string ExchangeRateAmountTooLarge = "exchangeRate.amountTooLarge";
    public const string TransferSameAccount = "transfer.sameAccount";
    public const string TransferReceivedAmountRequired = "transfer.receivedAmountRequired";
    public const string TransferAmountMismatch = "transfer.amountMismatch";
    public const string TransactionLinesMismatch = "transaction.linesMismatch";
    public const string TransactionSplitNotAllowed = "transaction.splitNotAllowed";
    public const string TransactionRefundOriginalInvalid = "transaction.refundOriginalInvalid";
    public const string TransactionLocationInvalid = "transaction.locationInvalid";
    public const string TransactionConversionFee = "transaction.conversionFee";
    public const string TransactionGroupMemberTaken = "transactionGroup.memberTaken";
    public const string GoalNotManual = "goal.notManual";
    public const string RecurringBillInactive = "recurringBill.inactive";
    public const string RecurringBillDebtShape = "recurringBill.debtShape";
    public const string HoldingOversold = "holding.oversold";
    public const string HoldingDependentSales = "holding.dependentSales";
    public const string HoldingCurrencyDiffers = "holding.currencyDiffers";
    public const string SecurityNotHeld = "security.notHeld";
    public const string AllocationShareInvalid = "allocation.shareInvalid";
    public const string AllocationSharesTotal = "allocation.sharesTotal";
    public const string AllocationBucketUnknown = "allocation.bucketUnknown";
    public const string AllocationBucketDuplicate = "allocation.bucketDuplicate";
    public const string ImportInvalidFile = "import.invalidFile";
    public const string ImportNoStatementForAccount = "import.noStatementForAccount";
    public const string ImportTransferMismatch = "import.transferMismatch";
    public const string ImportTransferAlreadyMatched = "import.transferAlreadyMatched";
    public const string ImportEntryMismatch = "import.entryMismatch";
    public const string ImportRefundInvalid = "import.refundInvalid";
    public const string ImportMissingColumns = "import.missingColumns";
    public const string ImportMappingIncomplete = "import.mappingIncomplete";
    public const string ImportInvalidDateFormat = "import.invalidDateFormat";
    public const string ImportTargetNotEmpty = "import.targetNotEmpty";
    public const string ImportAlreadyPresent = "import.alreadyPresent";
    public const string ImportNewerVersion = "import.newerVersion";
    public const string ImportUnknownVersion = "import.unknownVersion";
    public const string RestoreExpired = "restore.expired";
    public const string RestoreReferenceMissing = "restore.referenceMissing";
    public const string RestoreCompanionDeleted = "restore.companionDeleted";
    public const string RestoreDetailsLost = "restore.detailsLost";
    public const string RestoreSlotTaken = "restore.slotTaken";
    public const string RestoreSecurityChanged = "restore.securityChanged";
    public const string RestoreNameTaken = "restore.nameTaken";
    public const string ExportTooManyRows = "export.tooManyRows";
    public const string AssetDepreciationIncomplete = "asset.depreciationIncomplete";
    public const string AssetLastValuation = "asset.lastValuation";
    public const string DebtPaymentTooSmall = "debt.paymentTooSmall";
    public const string DebtScheduleIncomplete = "debt.scheduleIncomplete";
    public const string DebtPaymentWrongType = "debt.paymentWrongType";
    public const string DebtPaymentTaken = "debt.paymentTaken";
    public const string DebtNotTracked = "debt.notTracked";
    public const string DebtLastBalance = "debt.lastBalance";
    public const string DebtRatePrecision = "debt.ratePrecision";
    public const string AttachmentEmpty = "attachment.empty";
    public const string AttachmentTooLarge = "attachment.tooLarge";
    public const string AttachmentTypeNotAllowed = "attachment.typeNotAllowed";
    public const string AttachmentContentMismatch = "attachment.contentMismatch";
    public const string AttachmentLimitReached = "attachment.limitReached";
    public const string DashboardCardUnknown = "dashboard.cardUnknown";
    public const string DashboardCardDuplicate = "dashboard.cardDuplicate";
    public const string BackupInvalidFile = "backup.invalidFile";
    public const string BackupSchemaMismatch = "backup.schemaMismatch";
    public const string BackupTooLarge = "backup.tooLarge";
    public const string BrokerUnavailable = "broker.unavailable";
    public const string BrokerRejected = "broker.rejected";
    public const string BrokerTokenRequired = "broker.tokenRequired";
    public const string MarketPricesKeyRequired = "marketPrices.keyRequired";
    public const string MarketPricesKeyUnreadable = "marketPrices.keyUnreadable";
    public const string MarketPricesUnavailable = "marketPrices.unavailable";
    public const string MarketPricesRejected = "marketPrices.rejected";
    public const string EmailNotConfigured = "email.notConfigured";
    public const string EmailPasswordRequired = "email.passwordRequired";
    public const string EmailPasswordUnreadable = "email.passwordUnreadable";
    public const string EmailInsecureConnection = "email.insecureConnection";
    public const string EmailSendFailed = "email.sendFailed";
    public const string EmailAlreadyVerified = "email.alreadyVerified";
    public const string EmailTokenInvalid = "email.tokenInvalid";
    public const string PasswordResetTokenInvalid = "passwordReset.tokenInvalid";
    public const string DiscordInvalidWebhook = "discord.invalidWebhook";
    public const string DiscordWebhookUnreadable = "discord.webhookUnreadable";
    public const string DiscordWebhookGone = "discord.webhookGone";
    public const string DiscordRateLimited = "discord.rateLimited";
    public const string DiscordRejected = "discord.rejected";
    public const string DiscordSendFailed = "discord.sendFailed";
    public const string TelegramInvalidToken = "telegram.invalidToken";
    public const string TelegramInvalidChat = "telegram.invalidChat";
    public const string TelegramTokenUnreadable = "telegram.tokenUnreadable";
    public const string TelegramBotRemoved = "telegram.botRemoved";
    public const string TelegramRateLimited = "telegram.rateLimited";
    public const string TelegramRejected = "telegram.rejected";
    public const string TelegramSendFailed = "telegram.sendFailed";
    public const string MonthInvalid = "month.invalid";
    public const string MonthCloseNotEnded = "monthClose.notEnded";
    public const string ReconciliationFutureDate = "reconciliation.futureDate";
    public const string ReceiptUnsupportedFile = "receipt.unsupportedFile";
    public const string ReceiptPdfWithoutText = "receipt.pdfWithoutText";
    public const string ReceiptUnreadable = "receipt.unreadable";
    public const string ReceiptEngineUnavailable = "receipt.engineUnavailable";

    public static IReadOnlyList<string> All { get; } = typeof(ErrorCodes)
        .GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(field => field is { IsLiteral: true, IsInitOnly: false } && field.FieldType == typeof(string))
        .Select(field => (string)field.GetRawConstantValue()!)
        .Order(StringComparer.Ordinal)
        .ToList();

    private static readonly FrozenSet<string> Known = All.ToFrozenSet(StringComparer.Ordinal);

    public static bool IsKnown(string? errorCode) => errorCode is not null && Known.Contains(errorCode);

    public static int StatusCodeFor(string? errorCode) => errorCode switch
    {
        ResourceNotFound or FeatureDisabled => StatusCodes.Status404NotFound,
        ConflictDuplicate or ConflictStale or ConflictBusy or SetupAlreadyCompleted or RestoreSlotTaken
            or RestoreNameTaken or AttachmentLimitReached or MonthCloseNotEnded or DebtPaymentTaken or PasskeyLimitReached
            or TokenLimitReached or SettleUpAlreadySplit or SettleUpTransferTaken or TwoFactorAlreadyEnabled
            or ImportAlreadyPresent or IdempotencyKeyReused or TransactionGroupMemberTaken => StatusCodes.Status409Conflict,
        AccessForbidden or UserSelfChange or UserLastAdministrator or SecurityNotHeld or SessionCurrent
            or TokenNotAllowed => StatusCodes.Status403Forbidden,
        CredentialsInvalid or TokenInvalid or TwoFactorInvalidCode => StatusCodes.Status401Unauthorized,
        CredentialsLockedOut or TokenRateLimited => StatusCodes.Status429TooManyRequests,
        ReceiptEngineUnavailable => StatusCodes.Status503ServiceUnavailable,
        _ => StatusCodes.Status400BadRequest,
    };
}
