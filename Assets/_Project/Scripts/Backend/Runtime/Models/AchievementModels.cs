using System;
using System.Collections.Generic;

namespace RoyaleClash.Backend
{
    /// <summary>
    /// Like Mail, PlayFab has no distinct "Achievements" API — this composes
    /// IRemoteConfigService (the definitions: what counts, what it takes to complete) with
    /// IPlayerStatsService (the player's actual progress), rather than needing its own
    /// storage. See PlayFabAchievementService.
    /// </summary>
    [Serializable]
    public class AchievementDefinition
    {
        public string AchievementId;
        public string DisplayName;
        public string Description;
        public string StatName;
        public int TargetValue;
        public List<InventoryItemStack> Rewards = new List<InventoryItemStack>();
    }

    [Serializable]
    public struct AchievementProgress
    {
        public string AchievementId;
        public int CurrentValue;
        public int TargetValue;
        public bool Completed;
        public bool RewardClaimed;
    }
}
