namespace JxFinance.Common.Email;

public sealed record OutgoingEmail(string ToAddress, string ToName, string Subject, string Body);
