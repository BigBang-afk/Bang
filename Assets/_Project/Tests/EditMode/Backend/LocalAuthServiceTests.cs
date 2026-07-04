using System.Threading.Tasks;
using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Backend.Local;

namespace RoyaleClash.Tests.EditMode
{
    public class LocalAuthServiceTests
    {
        [Test]
        public async Task LoginWithDeviceId_Succeeds()
        {
            var auth = new LocalAuthService();
            AuthResult result = await auth.LoginWithDeviceIdAsync("device-123");

            Assert.IsTrue(result.Success);
            Assert.IsTrue(auth.IsLoggedIn);
            Assert.IsTrue(result.IsNewAccount);
        }

        [Test]
        public async Task LinkSocialAccount_BeforeLogin_Fails()
        {
            var auth = new LocalAuthService();
            AuthResult result = await auth.LinkSocialAccountAsync("google", "token");
            Assert.IsFalse(result.Success);
        }

        [Test]
        public async Task LinkSocialAccount_AfterLogin_Succeeds()
        {
            var auth = new LocalAuthService();
            await auth.LoginWithDeviceIdAsync("device-123");

            AuthResult result = await auth.LinkSocialAccountAsync("google", "token");

            Assert.IsTrue(result.Success);
        }
    }
}
