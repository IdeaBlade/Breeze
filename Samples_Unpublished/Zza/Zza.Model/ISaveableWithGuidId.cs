using System;

namespace Zza.Model
{
    /// <summary>
    /// Interface for saveable entities with a Guid Id;
    /// </summary>
    public interface ISaveableWithGuidId : ISaveable, IHasGuidId {}
}
