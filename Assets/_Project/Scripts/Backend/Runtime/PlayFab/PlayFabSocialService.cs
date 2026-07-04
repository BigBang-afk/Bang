#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>
    /// Friends use PlayFab's native client Friends API directly (read/add/remove are safe as
    /// direct client calls — they only affect the caller's own friend list). Clan operations
    /// go through CloudScript instead of PlayFab's raw Groups API: clan mechanics here have
    /// game-specific rules (trophy requirements to join, donation limits/rewards) that need
    /// server-side validation anyway, so custom CloudScript functions are more appropriate
    /// than wiring the generic Groups primitives directly — same reasoning as
    /// PlayFabInventoryService routing grants/consumes through CloudScript.
    /// </summary>
    public sealed class PlayFabSocialService : ISocialService
    {
        private readonly ICloudFunctionsService _cloudFunctions;

        public PlayFabSocialService(ICloudFunctionsService cloudFunctions) => _cloudFunctions = cloudFunctions;

        public async Task<GameResult<IReadOnlyList<FriendInfo>>> GetFriendsAsync()
        {
            var request = new GetFriendsListRequest();
            PlayFabResult<GetFriendsListResult> result = await PlayFabClientAPI.GetFriendsListAsync(request);
            if (result.Error != null)
                return GameResult<IReadOnlyList<FriendInfo>>.Fail(result.Error.ErrorMessage);

            IReadOnlyList<FriendInfo> friends = result.Result.Friends.Select(f => new FriendInfo
            {
                AccountId = new PlayerAccountId(f.FriendPlayFabId),
                DisplayName = f.TitleDisplayName ?? f.Username,
                Status = FriendStatus.Offline, // PlayFab doesn't track live presence; wire to Fusion's session list (Module 4) if "online now" matters.
            }).ToList();

            return GameResult<IReadOnlyList<FriendInfo>>.Ok(friends);
        }

        public async Task<GameResult> AddFriendAsync(PlayerAccountId accountId)
        {
            var request = new AddFriendRequest { FriendPlayFabId = accountId.Value };
            PlayFabResult<AddFriendResult> result = await PlayFabClientAPI.AddFriendAsync(request);
            return result.Error != null ? GameResult.Fail(result.Error.ErrorMessage) : GameResult.Successful;
        }

        public async Task<GameResult> RemoveFriendAsync(PlayerAccountId accountId)
        {
            var request = new RemoveFriendRequest { FriendPlayFabId = accountId.Value };
            PlayFabResult<RemoveFriendResult> result = await PlayFabClientAPI.RemoveFriendAsync(request);
            return result.Error != null ? GameResult.Fail(result.Error.ErrorMessage) : GameResult.Successful;
        }

        public async Task<GameResult<IReadOnlyList<FriendInfo>>> SearchPlayersAsync(string displayNameQuery)
        {
            GameResult<FriendInfo[]> result = await _cloudFunctions.ExecuteAsync<string, FriendInfo[]>("searchPlayers", displayNameQuery);
            return result.Success
                ? GameResult<IReadOnlyList<FriendInfo>>.Ok(result.Value)
                : GameResult<IReadOnlyList<FriendInfo>>.Fail(result.Error);
        }

        public async Task<GameResult<ClanInfo>> GetClanAsync() =>
            await _cloudFunctions.ExecuteAsync<object, ClanInfo>("getClan", null);

        public async Task<GameResult> JoinClanAsync(string clanId)
        {
            GameResult<CloudFunctionAck> result = await _cloudFunctions.ExecuteAsync<string, CloudFunctionAck>("joinClan", clanId);
            return result.Success ? GameResult.Successful : GameResult.Fail(result.Error);
        }

        public async Task<GameResult> LeaveClanAsync()
        {
            GameResult<CloudFunctionAck> result = await _cloudFunctions.ExecuteAsync<object, CloudFunctionAck>("leaveClan", null);
            return result.Success ? GameResult.Successful : GameResult.Fail(result.Error);
        }

        public async Task<GameResult> DonateToClanAsync(string cardId, int amount)
        {
            var args = new DonateArgs { cardId = cardId, amount = amount };
            GameResult<CloudFunctionAck> result = await _cloudFunctions.ExecuteAsync<DonateArgs, CloudFunctionAck>("donateToClan", args);
            return result.Success ? GameResult.Successful : GameResult.Fail(result.Error);
        }

        [System.Serializable]
        private struct DonateArgs
        {
            public string cardId;
            public int amount;
        }

        [System.Serializable]
        private struct CloudFunctionAck
        {
            public bool success;
        }
    }
}
#endif
