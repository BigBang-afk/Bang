#if ROYALECLASH_PHOTON_FUSION
using Fusion;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using UnityEngine;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Ties the pieces above into an actual match: assigns each joining player a
    /// <see cref="PlayerSlot"/>, spawns their <see cref="BattlePlayerNetworkController"/>,
    /// and — once both players have joined — spawns the single <see cref="BattleSimulationRunner"/>
    /// that will own the match. Lives on a NetworkObject placed in the battle scene.
    /// </summary>
    public sealed class BattleSessionCoordinator : NetworkBehaviour
    {
        [SerializeField] private NetworkPrefabRef _playerControllerPrefab;
        [SerializeField] private NetworkPrefabRef _simulationRunnerPrefab;
        [SerializeField] private NetworkPrefabRef _entityViewPrefab;

        private readonly NetworkPlayerRegistry _registry = new NetworkPlayerRegistry();
        private BattleCardSet _cardSet;

        /// <summary>Supplied by whatever assembled both players' decks into blueprints (Module 5/7 territory) before the match scene loads.</summary>
        public void Initialize(BattleCardSet cardSet) => _cardSet = cardSet;

        public void HandlePlayerJoined(NetworkRunner runner, PlayerRef player)
        {
            if (!Object.HasStateAuthority) return;

            PlayerSlot slot = _registry.AssignSlot(player);

            NetworkObject controllerObject = runner.Spawn(_playerControllerPrefab, inputAuthority: player);
            var controller = controllerObject.GetComponent<BattlePlayerNetworkController>();
            controller.AssignedSlotValue = slot.Value;

            if (_registry.Count >= NetworkingConstants.MaxPlayersPerMatch)
                StartMatch(runner);
        }

        private void StartMatch(NetworkRunner runner)
        {
            if (_cardSet == null)
            {
                Debug.LogError("Royale Clash: BattleSessionCoordinator.Initialize(cardSet) must be called before players join.");
                return;
            }

            NetworkObject simulationObject = runner.Spawn(_simulationRunnerPrefab);
            var simulationRunner = simulationObject.GetComponent<BattleSimulationRunner>();
            simulationRunner.Initialize(_cardSet, new PlayerSlot(0), new PlayerSlot(1), _entityViewPrefab);
        }
    }
}
#endif
