namespace JxFinance.Tests.Support;

public static class SampleMarketPrices
{
    public const string EodhdSearchByIsin = """
        [
          {"Code":"VWCE","Exchange":"XETRA","Name":"Vanguard FTSE All-World UCITS ETF USD Accumulation","Type":"ETF","Country":"Germany","Currency":"EUR","ISIN":"IE00BK5BQT80","isPrimary":true,"previousClose":139.62,"previousCloseDate":"2026-09-29"},
          {"Code":"VWRP","Exchange":"LSE","Name":"Vanguard FTSE All-World UCITS ETF USD Accumulation","Type":"ETF","Country":"UK","Currency":"GBX","ISIN":"IE00BK5BQT80","isPrimary":false,"previousClose":12134,"previousCloseDate":"2026-09-29"},
          {"Code":"VWCE","Exchange":"MI","Name":"Vanguard FTSE All-World UCITS ETF USD Accumulation","Type":"ETF","Country":"Italy","Currency":"EUR","ISIN":"IE00BK5BQT80","isPrimary":false,"previousClose":139.58,"previousCloseDate":"2026-09-29"}
        ]
        """;

    public const string EodhdSearchXetra = """
        [
          {"Code":"VWCE","Exchange":"XETRA","Name":"Vanguard FTSE All-World UCITS ETF USD Accumulation","Type":"ETF","Country":"Germany","Currency":"EUR","ISIN":"IE00BK5BQT80","isPrimary":true,"previousClose":139.62,"previousCloseDate":"2026-09-29"}
        ]
        """;

    public const string EodhdEodXetra = """
        [
          {"date":"2026-09-25","open":138.9,"high":139.44,"low":138.62,"close":139.3,"adjusted_close":139.3,"volume":182340},
          {"date":"2026-09-28","open":139.4,"high":139.9,"low":139.02,"close":139.62,"adjusted_close":139.62,"volume":201177}
        ]
        """;

    public const string EodhdSearchLse = """
        [
          {"Code":"VWRP","Exchange":"LSE","Name":"Vanguard FTSE All-World UCITS ETF USD Accumulation","Type":"ETF","Country":"UK","Currency":"GBX","ISIN":"IE00BK5BQT80","isPrimary":false,"previousClose":12134,"previousCloseDate":"2026-09-29"}
        ]
        """;

    public const string EodhdEodLse = """
        [
          {"date":"2026-09-28","open":12090,"high":12160,"low":12070,"close":12134,"adjusted_close":12134,"volume":94118}
        ]
        """;

    public const string KrakenOhlcXbtEur = """
        {
          "error": [],
          "result": {
            "XXBTZEUR": [
              [1790294400, "95120.0", "96200.1", "94800.0", "95880.4", "95512.3", "412.33204511", 21450],
              [1790380800, "95880.4", "96610.0", "95300.2", "96122.7", "95990.8", "288.10457781", 17322],
              [1790467200, "96122.7", "96400.0", "95010.5", "95350.1", "95711.4", "301.99812004", 18110]
            ],
            "last": 1790380800
          }
        }
        """;

    public const string KrakenUnknownPair = """
        {"error":["EQuery:Unknown asset pair"]}
        """;
}
