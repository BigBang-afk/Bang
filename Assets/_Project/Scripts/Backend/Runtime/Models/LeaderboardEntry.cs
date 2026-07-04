using System;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    [Serializable]
    public struct LeaderboardEntry
    {
        public PlayerAccountId AccountId;
        public string DisplayName;
        public int Position;
        public int StatValue;

        public LeaderboardEntry(PlayerAccountId accountId, string displayName, int position, int statValue)
        {
            AccountId = accountId;
            DisplayName = displayName;
            Position = position;
            StatValue = statValue;
        }
    }
}
