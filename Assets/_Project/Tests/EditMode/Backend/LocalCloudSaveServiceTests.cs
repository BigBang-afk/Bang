using System.Threading.Tasks;
using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Backend.Local;

namespace RoyaleClash.Tests.EditMode
{
    public class LocalCloudSaveServiceTests
    {
        [Test]
        public async Task SaveThenLoad_RoundTrips()
        {
            var service = new LocalCloudSaveService();
            await service.SaveAsync("key", 42);

            GameResult<int> result = await service.LoadAsync<int>("key");

            Assert.IsTrue(result.Success);
            Assert.AreEqual(42, result.Value);
        }

        [Test]
        public async Task Load_MissingKey_Fails()
        {
            var service = new LocalCloudSaveService();
            GameResult<int> result = await service.LoadAsync<int>("missing");
            Assert.IsFalse(result.Success);
        }

        [Test]
        public async Task Load_WrongType_Fails()
        {
            var service = new LocalCloudSaveService();
            await service.SaveAsync("key", "a string");

            GameResult<int> result = await service.LoadAsync<int>("key");

            Assert.IsFalse(result.Success);
        }

        [Test]
        public async Task Delete_RemovesValue()
        {
            var service = new LocalCloudSaveService();
            await service.SaveAsync("key", 1);
            await service.DeleteAsync("key");

            GameResult<int> result = await service.LoadAsync<int>("key");

            Assert.IsFalse(result.Success);
        }
    }
}
