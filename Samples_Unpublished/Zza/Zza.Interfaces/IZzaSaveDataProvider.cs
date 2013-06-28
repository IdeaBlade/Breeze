namespace Zza.Interfaces
{
    public interface IZzaSaveDataProvider
    {
        object GetExisting(object o, bool cacheOk=true);
    }
}