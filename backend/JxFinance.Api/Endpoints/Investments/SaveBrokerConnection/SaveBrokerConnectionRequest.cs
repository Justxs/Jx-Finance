using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Investments.SaveBrokerConnection;

public sealed record SaveBrokerConnectionRequest(
    string QueryId,
    string? Token = null,
    Guid? FundingAccountId = null,
    bool IsEnabled = true)
{
    public Guid AccountId { get; init; }

    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"QueryId = {QueryId}, Token = {SecretText.Hidden}, FundingAccountId = {FundingAccountId}, "
            + $"IsEnabled = {IsEnabled}, AccountId = {AccountId}");
        return true;
    }
}
