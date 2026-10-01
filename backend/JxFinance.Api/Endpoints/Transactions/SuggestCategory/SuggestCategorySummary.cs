using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.SuggestCategory;

public sealed class SuggestCategorySummary : Summary<SuggestCategoryEndpoint, SuggestCategoryRequest>
{
    public SuggestCategorySummary()
    {
        Summary = "Suggest a category for a transaction being entered";
        Description = "Answers the category your first matching categorization rule sets, while the categorizationRules "
            + "feature is on, and otherwise the category a naive Bayes model trained on the categorized transactions you "
            + "can see guesses, when it is sure enough. The model is built for this request inside the API and thrown away "
            + "with it; nothing is stored or sent anywhere. Every field of the answer is null when neither has an opinion. "
            + "Only reads; nothing is set on any transaction. It is a POST so that the description never lands in a URL. "
            + "Needs the learnedCategories feature.";
        ExampleRequest = new SuggestCategoryRequest(Guid.Empty, FlowType.Expense, 12.40m, "MAXIMA LT 0412");
        RequestParam(r => r.AccountId, "The account the transaction is on.");
        RequestParam(r => r.Type, "The flow type; only categories of this type are suggested.");
        RequestParam(r => r.Amount, "The amount, zero or more, with at most two decimal places.");
        RequestParam(r => r.Description, "The description as typed, at most 500 characters.");
        Responses[200] = "The suggested category with its source (rule or learned) and the rule's name or the model's confidence, or every field null.";
        Responses[400] = "Validation failed, or the account is not visible to you.";
        Responses[404] = "The learnedCategories feature is switched off (feature.disabled).";
    }
}
