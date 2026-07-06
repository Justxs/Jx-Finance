namespace JxFinance.Endpoints.Users.CreateUser;

public sealed record CreateUserRequest(string Email, string DisplayName, string Role, string Password);
