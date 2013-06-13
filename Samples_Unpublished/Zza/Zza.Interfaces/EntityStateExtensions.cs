using System;
using System.IO;
using Breeze.WebApi;

namespace Zza.Interfaces
{
    public static class EntityStateExtensions
    {
        public static bool IsAdded(this EntityState state)
        {
            return state == EntityState.Added;
        }
        public static bool IsDeleted(this EntityState state)
        {
            return state == EntityState.Deleted;
        }
        public static bool IsUpdated(this EntityState state)
        {
            return state == EntityState.Modified;
        }
        public static string OperationName(this EntityState state)
        {
            switch (state)
            {
                case EntityState.Added:
                    return "add";
                case EntityState.Modified:
                    return "update";
                case EntityState.Deleted:
                    return "delete";
                default:
                    throw new InvalidOperationException(state + " is not a valid operation");
            }
        }
    }
}
