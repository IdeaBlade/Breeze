namespace Zza.Interfaces
{
    public enum OperationType
    {
        Query,
        Add,
        Update,
        Delete
    }
   
    public static class OperationTypeExtensions
    {
        public static bool IsAdded(this OperationType state)
        {
            return state == OperationType.Add;
        }
        public static bool IsDeleted(this OperationType state)
        {
            return state == OperationType.Delete;
        }
        public static bool IsUpdated(this OperationType state)
        {
            return state == OperationType.Update;
        }
        public static bool IsQuery(this OperationType state)
        {
            return state == OperationType.Query;
        }
    }
}
