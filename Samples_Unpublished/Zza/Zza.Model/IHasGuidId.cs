using System;

namespace Zza.Model
{
    /// <summary>
    /// Interface for entities with a Guid Id;
    /// </summary>
    public interface IHasGuidId 
    {
        Guid Id { get; }
    }
}
