using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public interface IAchievementService
    {
        Task<GameResult<IReadOnlyList<AchievementProgress>>> GetProgressAsync();

        /// <summary>Grants the reward via IInventoryService and marks claimed — fails if not yet completed or already claimed.</summary>
        Task<GameResult> ClaimRewardAsync(string achievementId);
    }
}
