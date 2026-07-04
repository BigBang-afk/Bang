#if ROYALECLASH_PHOTON_FUSION
using System;
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Maps a <see cref="MatchRequest"/> onto a Fusion <c>NetworkRunner.StartGame</c> call.
    ///
    /// Ranked/Tournament matches use <see cref="GameMode.Server"/> — a dedicated server build
    /// holds authority, so no competing player can ever be the trusted host. Friendly/Private
    /// matches use <see cref="GameMode.Host"/> — one peer is both a player and the authority,
    /// which is an acceptable integrity trade-off for casual play and avoids paying for
    /// dedicated server capacity on non-competitive traffic. Practice/AI never touches Fusion
    /// at all (see <see cref="PracticeMatchHost"/>).
    ///
    /// Session/region selection for Ranked is expected to be brokered by PlayFab matchmaking
    /// (Module 5) rather than Photon's own lobby, so a rank's skill-based pairing lives in one
    /// place; this method assumes <paramref name="request"/> already carries a resolved region.
    /// </summary>
    public static class MatchmakingService
    {
        public static async Task<NetworkRunner> StartMatch(MatchRequest request, SceneRef battleScene)
        {
            var runnerObject = new GameObject($"NetworkRunner_{request.Mode}");
            var runner = runnerObject.AddComponent<NetworkRunner>();
            runner.ProvideInput = false; // discrete deploy/cast/activate commands over RPC, not a per-tick polled input struct.

            GameMode gameMode = request.Mode switch
            {
                MatchMode.Ranked => GameMode.Server,
                MatchMode.Tournament => GameMode.Server,
                MatchMode.Spectator => GameMode.Client,
                _ => GameMode.Host,
            };

            var args = new StartGameArgs
            {
                GameMode = gameMode,
                SessionName = ResolveSessionName(request),
                Scene = battleScene,
                PlayerCount = NetworkingConstants.MaxPlayersPerMatch,
            };

            StartGameResult result = await runner.StartGame(args);
            if (!result.Ok)
            {
                Debug.LogError($"Royale Clash: StartGame failed for {request.Mode}: {result.ShutdownReason}");
                UnityEngine.Object.Destroy(runnerObject);
                return null;
            }

            return runner;
        }

        private static string ResolveSessionName(MatchRequest request)
        {
            return request.Mode switch
            {
                MatchMode.Private => request.RoomCode ?? throw new ArgumentException("Private matches require a room code."),
                MatchMode.Friendly => request.RoomCode ?? Guid.NewGuid().ToString("N").Substring(0, 8),
                // Null lets Photon's own matchmaker place the player into/create a session for Ranked/Tournament/Spectator pools.
                _ => null,
            };
        }
    }
}
#endif
