using FastEndpoints;

namespace JxFinance.Endpoints.Investments.ImportSecurityPrices;

public sealed class ImportSecurityPricesSummary : Summary<ImportSecurityPricesEndpoint, ImportSecurityPricesRequest>
{
    public ImportSecurityPricesSummary()
    {
        Summary = "Import the price history of one security from a CSV";
        Description = "Reads a CSV of at most 5 MB with a header row holding date and price columns. Dates are "
            + "YYYY-MM-DD, YYYY.MM.DD or DD.MM.YYYY, a price may use a decimal point or a decimal comma, and the "
            + "delimiter is detected. Each price is recorded in the price history as imported from a file: it replaces "
            + "a fetched price of the same date and is never replaced by one. Makes no outside request and works "
            + "whether or not daily price fetching is on. Allowed for an administrator or someone who holds the "
            + "security, as for setting a price.";
        Responses[200] = "How many prices were written, how many readable lines changed nothing (the same price again, "
            + "or a date in the future), and how many lines could not be read.";
        Responses[400] = "import.invalidFile for a file that is not a CSV or too large, import.missingColumns without "
            + "date and price columns.";
        Responses[403] = "security.notHeld: the caller neither holds the security nor is an administrator.";
        Responses[404] = "No such security.";
        Responses[409] = "Someone else recorded a price for one of these dates at the same time.";
    }
}
