#if ROYALECLASH_PHOTON_FUSION
using System.Threading.Tasks;
using Fusion;
using UnityEngine;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Remembers the current match's session so a dropped connection can rejoin the same
    /// match instead of forfeiting. Relies on the server-side NetworkProjectConfig disconnect
    /// timeout keeping a disconnected player's slot/state reserved for a grace window — this
    /// class only handles the client's rejoin attempt; the "keep their towers/troops alive
    /// while they're gone" behavior is Fusion's own reconnect support plus the fact that
    /// BattleSimulation only runs on the State Authority, which never goes away when one
    /// input-authority client drops.
    /// </summary>
    public sealed class ReconnectService
    {
        private string _lastSessionName;
        private SceneRef _lastScene;
        private int _attempts;

        public bool HasResumableSession => !string.IsNullOrEmpty(_lastSessionName);

        public void RememberSession(string sessionName, SceneRef scene)
        {
            _lastSessionName = sessionName;
            _lastScene = scene;
            _attempts = 0;
        }

        public void ForgetSession()
        {
            _lastSessionName = null;
            _attempts = 0;
        }

        public async Task<NetworkRunner> TryReconnect()
        {
            if (!HasResumableSession)
                return null;

            while (_attempts < NetworkingConstants.MaxReconnectAttempts)
            {
                _attempts++;

                var runnerObject = new GameObject($"NetworkRunner_Reconnect_{_attempts}");
                var runner = runnerObject.AddComponent<NetworkRunner>();
                runner.ProvideInput = false;

                var args = new StartGameArgs
                {
                    GameMode = GameMode.Client,
                    SessionName = _lastSessionName,
                    Scene = _lastScene,
                };

                StartGameResult result = await runner.StartGame(args);
                if (result.Ok)
                {
                    _attempts = 0;
                    return runner;
                }

                Debug.LogWarning($"Royale Clash: reconnect attempt {_attempts}/{NetworkingConstants.MaxReconnectAttempts} failed: {result.ShutdownReason}");
                Object.Destroy(runnerObject);
            }

            ForgetSession();
            return null;
        }
    }
}
#endif
