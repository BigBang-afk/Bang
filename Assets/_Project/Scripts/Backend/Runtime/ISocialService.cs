using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    /// <summary>Friends and Clans together — both are the same underlying "social graph against a Groups-like backend" concept (see PlayFabSocialService, built on PlayFab's Groups API for clans).</summary>
    public interface ISocialService
    {
        Task<GameResult<IReadOnlyList<FriendInfo>>> GetFriendsAsync();
        Task<GameResult> AddFriendAsync(PlayerAccountId accountId);
        Task<GameResult> RemoveFriendAsync(PlayerAccountId accountId);
        Task<GameResult<IReadOnlyList<FriendInfo>>> SearchPlayersAsync(string displayNameQuery);

        Task<GameResult<ClanInfo>> GetClanAsync();
        Task<GameResult> JoinClanAsync(string clanId);
        Task<GameResult> LeaveClanAsync();
        Task<GameResult> DonateToClanAsync(string cardId, int amount);
    }
}
