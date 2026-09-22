using JxFinance.Common.Sharing;

namespace JxFinance.Endpoints.Tags.Shared;

public interface ITagInput : IShareableInput
{
    string Name { get; }
}
