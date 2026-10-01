using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.CountOpenBalances;

public sealed class CountOpenBalancesSummary : Summary<CountOpenBalancesEndpoint, CountOpenBalancesRequest>
{
    public CountOpenBalancesSummary()
    {
        Summary = "Count open settle-up balances in your net worth";
        Description = "Chooses, for you alone, whether your open balances with your households and with people outside them "
            + "count in your net worth: what others owe you as a receivable inside assets and what you owe as a payable "
            + "inside debts, each converted at today's rate. Off by default. Answers your net worth as it now stands and "
            + "records today's snapshot with it, so the history follows from today; earlier snapshots are not rewritten.";
        ExampleRequest = new CountOpenBalancesRequest(true);
        Responses[200] = "Your current net worth under the new choice.";
        Responses[400] = "Validation failed: count is missing (required).";
    }
}
