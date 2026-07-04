using RoyaleClash.Backend.Local;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    /// <summary>
    /// Registers backend services into <see cref="ServiceLocator"/> so the rest of the game
    /// (UI, Economy, Progression) depends only on the interfaces in this assembly, never on
    /// whether the player is actually online. <see cref="RegisterLocal"/> is always available;
    /// the PlayFab-backed registration (gated behind ROYALECLASH_PLAYFAB, see
    /// docs/BACKEND.md) lives in <c>PlayFab/BackendServices.PlayFab.cs</c> as the other half
    /// of this partial class.
    /// </summary>
    public static partial class BackendServices
    {
        public static void RegisterLocal(PlayerAccountId localAccountId = default, string localDisplayName = "Player")
        {
            var cloudSave = new LocalCloudSaveService();
            var inventory = new LocalInventoryService();
            var stats = new LocalPlayerStatsService();
            var remoteConfig = new LocalRemoteConfigService();
            var cloudFunctions = new LocalCloudFunctionsService();

            ServiceLocator.Register<IAuthService>(new LocalAuthService());
            ServiceLocator.Register<ICloudSaveService>(cloudSave);
            ServiceLocator.Register<IInventoryService>(inventory);
            ServiceLocator.Register<IPlayerStatsService>(stats);
            ServiceLocator.Register<ILeaderboardService>(new LocalLeaderboardService(stats, localAccountId, localDisplayName));
            ServiceLocator.Register<ISocialService>(new LocalSocialService());
            ServiceLocator.Register<IMailService>(new LocalMailService(cloudSave, inventory));
            ServiceLocator.Register<IRemoteConfigService>(remoteConfig);
            ServiceLocator.Register<ICloudFunctionsService>(cloudFunctions);
            ServiceLocator.Register<IAchievementService>(new LocalAchievementService(remoteConfig, stats, inventory, cloudSave));
        }
    }
}
