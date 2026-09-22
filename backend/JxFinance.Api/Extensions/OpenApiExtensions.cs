using FastEndpoints.OpenApi;
using JxFinance.Common.Json;
using JxFinance.Common.OpenApi;
using JxFinance.Infrastructure.Auth;
using Microsoft.OpenApi;

namespace JxFinance.Extensions;

public static class OpenApiExtensions
{
    public const string DocumentName = "v1";
    public const string Title = "Jx Finance API";

    private const string DocumentDescription =
        "Personal and household finance ledger. Every route lives under /api and answers JSON. "
        + "Money is carried as a decimal string with at most two decimal places so nothing is lost "
        + "to floating point; dates are YYYY-MM-DD in the instance time zone. Collections that can "
        + "grow are paged with page and pageSize and answer with items, page, pageSize, and total. "
        + "Authentication is a session cookie from POST /api/auth/login, so browser clients must "
        + "send credentials. Failures answer application/problem+json with a machine-readable code "
        + "per error; see the ProblemDetails schema.";

    public static IServiceCollection AddApiOpenApiDocument(this IServiceCollection services)
    {
        services.OpenApiDocument(options =>
        {
            options.DocumentName = DocumentName;
            options.Title = Title;
            options.Version = DocumentName;
            options.ShortSchemaNames = true;
            options.EnableJWTBearerAuth = false;
            options.AutoTagPathSegmentIndex = 0;
            options.TagDescriptions = AddTagDescriptions;
            options.AddAuth(
                "Cookie",
                new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.ApiKey,
                    In = ParameterLocation.Cookie,
                    Name = AuthCookies.AccessToken,
                    Description = "JWT access token cookie issued by POST /api/auth/login and renewed by POST /api/auth/refresh. Send requests with credentials included.",
                });
            options.ConfigureOpenApi = openApi =>
            {
                openApi.AddSchemaTransformer((schema, context, _) =>
                {
                    if (context.JsonPropertyInfo is { AttributeProvider: { } attributes } property)
                    {
                        var money = attributes.GetCustomAttributes(typeof(MoneyAttribute), inherit: false).OfType<MoneyAttribute>().FirstOrDefault();
                        if (money is not null || attributes.IsDefined(typeof(QuantityAttribute), inherit: false))
                        {
                            var nullable = Nullable.GetUnderlyingType(property.PropertyType) is not null && money is not { NotNull: true };
                            DescribeDecimalString(schema, nullable);
                        }
                    }

                    return Task.CompletedTask;
                });
                openApi.AddDocumentTransformer((document, _, _) =>
                {
                    document.Info.Description = DocumentDescription;
                    document.Servers?.Clear();
                    SchemaVariants.Collapse(document);
                    ArrayWrappers.Inline(document);
                    ErrorContract.Describe(document);
                    OperationNames.Shorten(document);
                    return Task.CompletedTask;
                });
            };
        });

        return services;
    }

    private static void DescribeDecimalString(OpenApiSchema schema, bool nullable)
    {
        schema.Type = nullable ? JsonSchemaType.Null | JsonSchemaType.String : JsonSchemaType.String;
        schema.Format = DecimalString.Format;
        schema.Pattern = null;
        schema.Minimum = null;
        schema.Maximum = null;
        schema.ExclusiveMinimum = null;
        schema.ExclusiveMaximum = null;
        schema.MultipleOf = null;
        schema.OneOf = null;
        schema.AnyOf = null;
        schema.AllOf = null;
    }

    private static void AddTagDescriptions(IDictionary<string, string> tags)
    {
        tags[ApiTags.Accounts] = "Bank, cash, and card accounts that transactions post to.";
        tags[ApiTags.Auth] = "Sign in, sign out, the current profile, and two-factor enrolment.";
        tags[ApiTags.Budgets] = "Per-category spending limits for a month or a year.";
        tags[ApiTags.Categories] = "The income and expense categories transactions are attributed to.";
        tags[ApiTags.Dashboard] = "Aggregates for the home screen: balances, trends, category splits.";
        tags[ApiTags.Diagnostics] = "Unauthenticated liveness probes.";
        tags[ApiTags.Goals] = "Savings goals and their progress.";
        tags[ApiTags.Households] = "Households and their members; the unit that shared data belongs to.";
        tags[ApiTags.Imports] = "Bank statement import: preview a CSV, then confirm the rows to keep.";
        tags[ApiTags.NetWorth] = "Assets, debts, and the resulting net worth over time.";
        tags[ApiTags.Notifications] = "In-app notifications raised by background jobs: bill reminders and budget alerts.";
        tags[ApiTags.RecurringBills] = "Recurring entries — scheduled expenses, income and transfers — and confirming a due occurrence.";
        tags[ApiTags.Reports] = "Income and expense summaries over an arbitrary date range.";
        tags[ApiTags.Setup] = "First-run provisioning of the administrator account.";
        tags[ApiTags.Transactions] = "The ledger: single and split transactions, plus CSV and PDF exports.";
        tags[ApiTags.Transfers] = "Money moved between two of your own accounts, in one currency or across two.";
        tags[ApiTags.Investments] = "Securities, trades, dividends and holdings on investment accounts, with Interactive Brokers import.";
        tags[ApiTags.Conversions] = "One currency exchanged for another inside a single account.";
        tags[ApiTags.Currencies] = "Supported currencies, the reporting currency, and reference exchange rates.";
        tags[ApiTags.Users] = "Administration of user accounts and roles.";
        tags[ApiTags.Attachments] = "Receipts and other files kept alongside a transaction.";
        tags[ApiTags.Backups] = "Snapshots of the whole instance: create, download, upload, and restore one.";
        tags[ApiTags.CategorizationRules] = "Ordered rules that pick a category for matching transactions, plus a dry run over existing ones.";
        tags[ApiTags.Settings] = "Instance-wide preferences: language, time zone, reporting currency, features, and outgoing mail.";
        tags[ApiTags.Tags] = "Free-form labels that transactions can be marked with.";
        tags[ApiTags.Trash] = "Records that were deleted but can still be restored.";
    }
}
