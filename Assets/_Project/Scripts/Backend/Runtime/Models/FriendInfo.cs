using System;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public enum FriendStatus
    {
        Online,
        Offline,
        InBattle,
    }

    [Serializable]
    public struct FriendInfo
    {
        public PlayerAccountId AccountId;
        public string DisplayName;
        public int PlayerLevel;
        public FriendStatus Status;
    }
}
