#if ROYALECLASH_PHOTON_FUSION
using System;
using System.Collections.Generic;
using Fusion;
using Fusion.Sockets;
using UnityEngine;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Photon Fusion 2 runner callbacks. Only the handlers this game actually needs
    /// (player join/leave, disconnect) do anything meaningful; the rest are required by
    /// <see cref="INetworkRunnerCallbacks"/> but are no-ops for a tap/card-based strategy
    /// game — there's no per-tick polled input struct (<see cref="OnInput"/>) since actions
    /// are discrete RPCs (see BattlePlayerNetworkController), and scene loading is handled by
    /// NetworkRunner's own SceneManager.
    ///
    /// NOTE: this interface's exact member list can shift slightly between Fusion 2.x point
    /// releases. Once the real SDK is imported, the compiler will flag any mismatch here
    /// immediately (missing/extra interface members) — reconcile against whatever version is
    /// actually installed rather than assuming this list is final.
    /// </summary>
    public sealed class RoyaleClashNetworkCallbacks : MonoBehaviour, INetworkRunnerCallbacks
    {
        public event Action<NetworkRunner, PlayerRef> PlayerJoined;
        public event Action<NetworkRunner, PlayerRef> PlayerLeft;
        public event Action<NetworkRunner, NetDisconnectReason> Disconnected;

        public void OnPlayerJoined(NetworkRunner runner, PlayerRef player) => PlayerJoined?.Invoke(runner, player);
        public void OnPlayerLeft(NetworkRunner runner, PlayerRef player) => PlayerLeft?.Invoke(runner, player);
        public void OnDisconnectedFromServer(NetworkRunner runner, NetDisconnectReason reason) => Disconnected?.Invoke(runner, reason);

        public void OnShutdown(NetworkRunner runner, ShutdownReason shutdownReason) { }
        public void OnConnectedToServer(NetworkRunner runner) { }
        public void OnConnectRequest(NetworkRunner runner, NetworkRunnerCallbackArgs.ConnectRequest request, byte[] token) { }
        public void OnConnectFailed(NetworkRunner runner, NetAddress remoteAddress, NetConnectFailedReason reason) { }
        public void OnUserSimulationMessage(NetworkRunner runner, SimulationMessagePtr message) { }
        public void OnSessionListUpdated(NetworkRunner runner, List<SessionInfo> sessionList) { }
        public void OnCustomAuthenticationResponse(NetworkRunner runner, Dictionary<string, object> data) { }
        public void OnHostMigration(NetworkRunner runner, HostMigrationToken hostMigrationToken) { }
        public void OnReliableDataReceived(NetworkRunner runner, PlayerRef player, ReliableKey key, ArraySegment<byte> data) { }
        public void OnReliableDataProgress(NetworkRunner runner, PlayerRef player, ReliableKey key, float progress) { }
        public void OnInput(NetworkRunner runner, NetworkInput input) { }
        public void OnInputMissing(NetworkRunner runner, PlayerRef player, NetworkInput input) { }
        public void OnObjectExitAOI(NetworkRunner runner, NetworkObject obj, PlayerRef player) { }
        public void OnObjectEnterAOI(NetworkRunner runner, NetworkObject obj, PlayerRef player) { }
        public void OnSceneLoadDone(NetworkRunner runner) { }
        public void OnSceneLoadStart(NetworkRunner runner) { }
    }
}
#endif
