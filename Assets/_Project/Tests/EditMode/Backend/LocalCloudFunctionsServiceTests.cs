using System.Threading.Tasks;
using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Backend.Local;

namespace RoyaleClash.Tests.EditMode
{
    public class LocalCloudFunctionsServiceTests
    {
        [Test]
        public async Task ExecuteAsync_CallsRegisteredFunction()
        {
            var service = new LocalCloudFunctionsService();
            service.RegisterFunction<int, int>("double", x => x * 2);

            GameResult<int> result = await service.ExecuteAsync<int, int>("double", 21);

            Assert.IsTrue(result.Success);
            Assert.AreEqual(42, result.Value);
        }

        [Test]
        public async Task ExecuteAsync_UnregisteredFunction_Fails()
        {
            var service = new LocalCloudFunctionsService();
            GameResult<int> result = await service.ExecuteAsync<int, int>("missing", 1);
            Assert.IsFalse(result.Success);
        }

        [Test]
        public async Task ExecuteAsync_FunctionThrows_ReturnsFailureNotException()
        {
            var service = new LocalCloudFunctionsService();
            service.RegisterFunction<int, int>("boom", _ => throw new System.InvalidOperationException("nope"));

            GameResult<int> result = await service.ExecuteAsync<int, int>("boom", 1);

            Assert.IsFalse(result.Success);
            Assert.AreEqual("nope", result.Error);
        }
    }
}
