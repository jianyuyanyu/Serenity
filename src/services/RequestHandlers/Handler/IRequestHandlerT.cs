
namespace Serenity.Services;

/// <summary>
/// Marker interface for request handlers that operate on a specific entity type.
/// </summary>
/// <typeparam name="TRow">The entity type</typeparam>
public interface IRequestHandler<TRow> : IRequestHandler
{
}
