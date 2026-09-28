using FastEndpoints;

namespace JxFinance.Endpoints.Budgets.GetBudgetSuggestions;

public sealed class GetBudgetSuggestionsSummary : Summary<GetBudgetSuggestionsEndpoint, GetBudgetSuggestionsRequest>
{
    public GetBudgetSuggestionsSummary()
    {
        Summary = "Suggest budget limits from past spending";
        Description = "For every expense category you can see that had spending lately, returns what it cost in "
            + "each of the last six complete windows of the period, oldest first. The window that holds today is "
            + "left out because it is partial, and so is every window that ends before your earliest transaction. "
            + "Spend is attributed as on the budgets page, split lines by their share. With at least three windows "
            + "left the item carries their median, zero windows included, and a suggested limit: the median rounded "
            + "up to a whole unit of the reporting currency, or null when the median is zero. isSteady is true when "
            + "all six windows had spending, the median is at least 20 and the robust spread (median absolute "
            + "deviation times 1.4826) is at most a quarter of the median. hasBudget tells whether you already have "
            + "a budget of this period on the category. Nothing is written.";
        RequestParam(r => r.Period, "Weekly, Monthly, Quarterly, or Yearly: the windows to measure.");
        Responses[200] = "The categories with spending in those windows, by name.";
        Responses[400] = "The period is not one of the four.";
    }
}
