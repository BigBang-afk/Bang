#if ROYALECLASH_PLAYFAB
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>The PlayFab-backed half of BackendServices (see the other half in Backend/Runtime/BackendServices.cs).</summary>
    public static partial class BackendServices
    {
        public static void RegisterPlayFab()
        {
            var auth = new PlayFabAuthService();
            var cloudSave = new PlayFabCloudSaveService();
            var cloudFunctions = new PlayFabCloudFunctionsService();
            var stats = new PlayFabPlayerStatsService();
            var remoteConfig = new PlayFabRemoteConfigService();

            ServiceLocator.Register<IAuthService>(auth);
            ServiceLocator.Register<ICloudSaveService>(cloudSave);
            ServiceLocator.Register<IInventoryService>(new PlayFabInventoryService(cloudFunctions));
            ServiceLocator.Register<IPlayerStatsService>(stats);
            ServiceLocator.Register<ILeaderboardService>(new PlayFabLeaderboardService());
            ServiceLocator.Register<ISocialService>(new PlayFabSocialService(cloudFunctions));
            ServiceLocator.Register<IMailService>(new PlayFabMailService(cloudSave, cloudFunctions));
            ServiceLocator.Register<IRemoteConfigService>(remoteConfig);
            ServiceLocator.Register<ICloudFunctionsService>(cloudFunctions);
            ServiceLocator.Register<IAchievementService>(new PlayFabAchievementService(remoteConfig, stats, cloudFunctions));
        }
    }
}
#endif
