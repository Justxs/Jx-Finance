using JxFinance.Common.Sharing;

namespace JxFinance.Endpoints.Categories.Shared;

public interface ICategoryInput : IShareableInput
{
    string Name { get; }
    string? Icon { get; }
}
