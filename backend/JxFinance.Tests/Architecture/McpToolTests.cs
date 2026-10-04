using FastEndpoints;
using FastEndpoints.Mcp;
using JxFinance.Common;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed class McpToolTests
{
    private const string ListName = "Tools in Architecture/McpToolTests.cs";

    private static readonly string[] Tools =
    [
        "bulk_categorize_transactions",
        "bulk_tag_transactions",
        "confirm_recurring_bill",
        "create_transaction",
        "create_transfer",
        "delete_transaction",
        "delete_transfer",
        "get_account",
        "get_accounts",
        "get_allocation_targets",
        "get_archived_accounts",
        "get_asset_valuations",
        "get_asset_value_history",
        "get_assets",
        "get_bills_calendar",
        "get_budget_suggestions",
        "get_budgets",
        "get_cash_flow_forecast",
        "get_categories",
        "get_category_breakdown",
        "get_contact_entries",
        "get_contacts",
        "get_conversions",
        "get_currencies",
        "get_dashboard_summary",
        "get_debt_balances",
        "get_debt_payment_candidates",
        "get_debt_payments",
        "get_debt_schedule",
        "get_debts",
        "get_exchange_rate",
        "get_goals",
        "get_household",
        "get_household_audit",
        "get_households",
        "get_investment_transactions",
        "get_ledger",
        "get_monthly_trend",
        "get_net_worth",
        "get_net_worth_history",
        "get_payee_names",
        "get_ping",
        "get_places",
        "get_portfolio",
        "get_reconciliation_preview",
        "get_reconciliations",
        "get_recurring_bill",
        "get_recurring_bills",
        "get_recurring_totals",
        "get_report_summary",
        "get_securities",
        "get_security_prices",
        "get_settle_up",
        "get_settlements",
        "get_shared_expenses",
        "get_subscription_candidates",
        "get_tags",
        "get_tax_summary",
        "get_transaction",
        "get_transaction_group_members",
        "get_transaction_groups",
        "get_transactions",
        "get_transactions_summary",
        "get_transfers",
        "get_uncategorized_suggestions",
        "get_value_history",
        "update_goal_progress",
        "update_transaction",
        "update_transfer",
    ];

    [Fact]
    public void Exactly_the_token_routes_without_a_file_answer_are_mcp_tools()
    {
        var tools = FastEndpointsPipeline.Endpoints
            .Select(endpoint => endpoint.Metadata.GetMetadata<McpToolInfo>()?.Name)
            .OfType<string>()
            .Distinct()
            .Order(StringComparer.Ordinal)
            .ToList();

        ApprovedList.AssertMatches(
            Tools,
            tools,
            ListName,
            tool => $"{tool} is an MCP tool but not in {ListName}. Every token-readable or token-writable route without a file answer becomes a tool (McpTools.OptIn); add it if an AI client holding a personal API token may call it, or take the route off the token lists.",
            tool => $"{tool} is in {ListName} but no endpoint exposes it any more. Remove it from the list if the endpoint was renamed, removed or taken off the token lists on purpose.");
    }

    [Fact]
    public void Every_tool_is_a_token_readable_read_or_a_token_writable_write()
    {
        var strays = FastEndpointsPipeline.Endpoints
            .Where(endpoint => endpoint.Metadata.GetMetadata<McpToolInfo>() is not null)
            .Where(endpoint => endpoint.Metadata.GetMetadata<EndpointDefinition>() is { } definition && HttpMethods.IsGet(definition.Verbs[0])
                ? !TokenReadable.Allows(endpoint.Metadata)
                : !TokenWritable.Allows(endpoint.Metadata))
            .Select(endpoint => endpoint.RoutePattern.RawText)
            .ToList();

        Assert.True(
            strays.Count == 0,
            string.Join(Environment.NewLine, strays.Select(route =>
                $"/{route} is an MCP tool although a personal API token may not call it. McpTools.OptIn must skip it: check the token marks on the endpoint and the refusal in PersonalApiTokenGateMiddleware.")));
    }
}
