using Microsoft.Extensions.DependencyInjection;

namespace Serenity.ComponentModel;

/// <summary>
/// Enables auto registering for the implementation type this attribute is placed on by using
/// {Try}AddScoped{Keyed} method.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = false)]
public class RegisterScopedAttribute : RegisterServiceAttribute
{
    /// <summary>
    /// Creates a new instance of the attribute.
    /// </summary>
    public RegisterScopedAttribute()
    {
        Lifetime = ServiceLifetime.Scoped;
    }

    /// <summary>
    /// Creates a new instance of the attribute for specified types.
    /// </summary>
    /// <param name="types">Service types</param>
    /// <exception cref="ArgumentNullException"></exception>
    public RegisterScopedAttribute(params Type[] types) : this()
    {
        Types = types ?? throw new ArgumentNullException(nameof(types));
    }
}