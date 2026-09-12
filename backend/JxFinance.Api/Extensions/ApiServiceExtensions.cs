using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Mappers;
using JxFinance.Endpoints.Accounts.Services;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Services;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Mappers;
using JxFinance.Endpoints.Budgets.Services;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Mappers;
using JxFinance.Endpoints.Categories.Services;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Services;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Mappers;
using JxFinance.Endpoints.Goals.Services;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Mappers;
using JxFinance.Endpoints.Households.Services;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.Services;
using JxFinance.Endpoints.Notifications.Interfaces;
using JxFinance.Endpoints.Notifications.Mappers;
using JxFinance.Endpoints.Notifications.Services;
using JxFinance.Endpoints.Ping.Interfaces;
using JxFinance.Endpoints.Ping.Services;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Services;
using JxFinance.Endpoints.Reports.Interfaces;
using JxFinance.Endpoints.Reports.Services;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Services;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Endpoints.Transfers.Mappers;
using JxFinance.Endpoints.Transfers.Services;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi;
using Serilog;

namespace JxFinance.Extensions;

public static class ApiServiceExtensions
{
    public static WebApplicationBuilder AddApiServices(this WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .CreateLogger();

        builder.Host.UseSerilog();

        builder.Services.AddProblemDetails();
        builder.Services.ConfigureHttpJsonOptions(options =>
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
        builder.Services.AddFastEndpoints(JxFinance.Api.DiscoveredTypes.All);
        builder.Services.AddApiOpenApiDocument();

        var connectionString = builder.Configuration.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'Default' is not configured.");
        }

        builder.Services.AddHealthChecks()
            .AddNpgSql(connectionString);

        builder.Services.AddSingleton<AccountMapper>();
        builder.Services.AddSingleton<BudgetMapper>();
        builder.Services.AddSingleton<CategoryMapper>();
        builder.Services.AddSingleton<GoalMapper>();
        builder.Services.AddSingleton<HouseholdMapper>();
        builder.Services.AddSingleton<AssetMapper>();
        builder.Services.AddSingleton<DebtMapper>();
        builder.Services.AddSingleton<NotificationMapper>();
        builder.Services.AddSingleton<RecurringBillMapper>();
        builder.Services.AddSingleton<TransactionMapper>();
        builder.Services.AddSingleton<TransferMapper>();

        builder.Services.AddScoped<ICategoryAttributionService, CategoryAttributionService>();
        builder.Services.AddScoped<IPingService, PingService>();
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddScoped<IUserService, UserService>();
        builder.Services.AddScoped<IAccountService, AccountService>();
        builder.Services.AddScoped<ICategoryService, CategoryService>();
        builder.Services.AddScoped<ITransactionService, TransactionService>();
        builder.Services.AddScoped<ITransferService, TransferService>();
        builder.Services.AddScoped<IDashboardService, DashboardService>();
        builder.Services.AddScoped<IReportService, ReportService>();
        builder.Services.AddScoped<IBudgetService, BudgetService>();
        builder.Services.AddScoped<IGoalService, GoalService>();
        builder.Services.AddScoped<IHouseholdService, HouseholdService>();
        builder.Services.AddScoped<INetWorthService, NetWorthService>();
        builder.Services.AddScoped<IImportService, ImportService>();
        builder.Services.AddScoped<IRecurringBillService, RecurringBillService>();
        builder.Services.AddScoped<INotificationService, NotificationService>();
        builder.Services.AddSingleton<IEmailSender, LoggingEmailSender>();
        if (!builder.Configuration.GetValue<bool>("export-openapi-docs") && builder.Configuration.GetValue("App:BackgroundJobs", true))
        {
            builder.Services.AddHostedService<RecurringBillReminderJob>();
            builder.Services.AddHostedService<NetWorthSnapshotJob>();
        }

        return builder;
    }
}
