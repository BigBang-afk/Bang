using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>Offline stand-in: no friends, no clan — there's no one else to be social with. Real behavior lives in PlayFabSocialService.</summary>
    public sealed class LocalSocialService : ISocialService
    {
        private readonly List<FriendInfo> _friends = new List<FriendInfo>();

        public Task<GameResult<IReadOnlyList<FriendInfo>>> GetFriendsAsync() =>
            Task.FromResult(GameResult<IReadOnlyList<FriendInfo>>.Ok(_friends));

        public Task<GameResult> AddFriendAsync(PlayerAccountId accountId) =>
            Task.FromResult(GameResult.Fail("Friends require an online connection."));

        public Task<GameResult> RemoveFriendAsync(PlayerAccountId accountId)
        {
            _friends.RemoveAll(f => f.AccountId.Equals(accountId));
            return Task.FromResult(GameResult.Successful);
        }

        public Task<GameResult<IReadOnlyList<FriendInfo>>> SearchPlayersAsync(string displayNameQuery) =>
            Task.FromResult(GameResult<IReadOnlyList<FriendInfo>>.Ok(new List<FriendInfo>()));

        public Task<GameResult<ClanInfo>> GetClanAsync() =>
            Task.FromResult(GameResult<ClanInfo>.Fail("Not in a clan (offline)."));

        public Task<GameResult> JoinClanAsync(string clanId) =>
            Task.FromResult(GameResult.Fail("Clans require an online connection."));

        public Task<GameResult> LeaveClanAsync() =>
            Task.FromResult(GameResult.Successful);

        public Task<GameResult> DonateToClanAsync(string cardId, int amount) =>
            Task.FromResult(GameResult.Fail("Clans require an online connection."));
    }
}
