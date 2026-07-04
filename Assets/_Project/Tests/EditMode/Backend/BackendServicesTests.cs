using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Core;

namespace RoyaleClash.Tests.EditMode
{
    public class BackendServicesTests
    {
        [TearDown]
        public void ClearServiceLocator() => ServiceLocator.Clear();

        [Test]
        public void RegisterLocal_RegistersEveryBackendService()
        {
            BackendServices.RegisterLocal(new PlayerAccountId("p1"), "Ash");

            Assert.IsTrue(ServiceLocator.TryGet(out IAuthService _));
            Assert.IsTrue(ServiceLocator.TryGet(out ICloudSaveService _));
            Assert.IsTrue(ServiceLocator.TryGet(out IInventoryService _));
            Assert.IsTrue(ServiceLocator.TryGet(out IPlayerStatsService _));
            Assert.IsTrue(ServiceLocator.TryGet(out ILeaderboardService _));
            Assert.IsTrue(ServiceLocator.TryGet(out ISocialService _));
            Assert.IsTrue(ServiceLocator.TryGet(out IMailService _));
            Assert.IsTrue(ServiceLocator.TryGet(out IRemoteConfigService _));
            Assert.IsTrue(ServiceLocator.TryGet(out ICloudFunctionsService _));
            Assert.IsTrue(ServiceLocator.TryGet(out IAchievementService _));
        }
    }
}
