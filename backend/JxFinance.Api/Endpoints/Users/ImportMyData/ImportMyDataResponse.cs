namespace JxFinance.Endpoints.Users.ImportMyData;

public sealed record ImportMyDataResponse(int Tables, long Rows, int Attachments, int Removed);
