using System;

namespace Zza.Interfaces
{
    public static class Config
    {
        public static Guid GuestStoreId { get { return _guestStoreId; } }

        private const string _guestStoreIdName = "12345678-9ABC-DEF0-1234-56789ABCDEF0";
        private static readonly Guid _guestStoreId = new Guid(_guestStoreIdName);

    }
}
