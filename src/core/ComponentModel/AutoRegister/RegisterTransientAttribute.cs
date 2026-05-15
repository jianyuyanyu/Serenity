using Microsoft.Extensions.DependencyInjection;

namespace Serenity.ComponentModel;

/// <summary>
/// Enables auto registering for the implementation type this attribute is placed on by using
/// {Try}AddTransient{Keyed} method.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = false)]
public class RegisterTransientAttribute : RegisterServiceAttribute
{
    /// <summary>
    /// Creates a new instance of the attribute.
    /// </summary>
    public RegisterTransientAttribute()
    {
    }

    /// <summary>
    /// Creates a new instance of the attribute for specified types.
    /// </summary>
    /// <param name="types">Service types</param>
    /// <exception cref="ArgumentNullException"></exception>
    public RegisterTransientAttribute(params Type[] types) : this()
    {
        Types = types ?? throw new ArgumentNullException(nameof(types));
    }
}