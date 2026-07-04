#if ROYALECLASH_PHOTON_FUSION
using System.Collections.Generic;
using Fusion;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Lives on a NetworkObject spawned once by the State Authority when both players are
    /// ready. Owns the single source-of-truth <see cref="BattleSimulation"/> and is the ONLY
    /// place that simulation runs — remote clients never simulate locally; they only render
    /// the <see cref="NetworkedBattleEntityView"/> objects this class spawns/updates/despawns.
    /// This is what makes the match anti-cheat by construction: a client can request an
    /// action via <see cref="BattlePlayerNetworkController"/>'s RPCs, but only the authority's
    /// BattleSimulation validates and applies it — a compromised client can request whatever
    /// it wants and simply be told no.
    /// </summary>
    public sealed class BattleSimulationRunner : NetworkBehaviour
    {
        [Networked] public MatchPhaseNet NetPhase { get; private set; }
        [Networked] public int NetCrownsA { get; private set; }
        [Networked] public int NetCrownsB { get; private set; }
        [Networked] public MatchOutcomeNet NetOutcome { get; private set; }
        [Networked] public byte NetWinnerSlot { get; private set; } // 0/1 meaningful only when NetOutcome == Decisive.

        private BattleSimulation _simulation;
        private PlayerSlot _playerA;
        private PlayerSlot _playerB;
        private NetworkPrefabRef _entityViewPrefab;
        private readonly Dictionary<EntityId, NetworkedBattleEntityView> _views = new Dictionary<EntityId, NetworkedBattleEntityView>();

        public BattleSimulation Simulation => _simulation;

        /// <summary>Called by the host once, immediately after spawning this object and before either player can act.</summary>
        public void Initialize(BattleCardSet cardSet, PlayerSlot playerA, PlayerSlot playerB, NetworkPrefabRef entityViewPrefab)
        {
            _playerA = playerA;
            _playerB = playerB;
            _entityViewPrefab = entityViewPrefab;

            _simulation = new BattleSimulation(playerA, playerB, cardSet);
            _simulation.EntitySpawned += OnEntitySpawned;
            _simulation.EntityDied += OnEntityDied;
            _simulation.MatchEnded += OnMatchEnded;
            _simulation.Start();
        }

        public override void FixedUpdateNetwork()
        {
            if (!Object.HasStateAuthority || _simulation == null) return;

            _simulation.Tick(BattleConstants.FixedDeltaTime);

            NetPhase = ToNet(_simulation.Phase);
            NetCrownsA = _simulation.GetCrowns(_playerA);
            NetCrownsB = _simulation.GetCrowns(_playerB);

            foreach (KeyValuePair<EntityId, NetworkedBattleEntityView> kvp in _views)
                kvp.Value.WriteFromEntity(FindEntity(kvp.Key));
        }

        private BattleEntity FindEntity(EntityId id)
        {
            IReadOnlyList<BattleEntity> entities = _simulation.Entities;
            for (int i = 0; i < entities.Count; i++)
                if (entities[i].Id == id) return entities[i];
            return null;
        }

        private void OnEntitySpawned(BattleEntity entity)
        {
            if (!Object.HasStateAuthority) return;

            NetworkObject obj = Runner.Spawn(_entityViewPrefab, entity.Position.ToUnityVector3());
            var view = obj.GetComponent<NetworkedBattleEntityView>();
            view.Initialize(entity.Id, entity.Kind, entity.Owner);
            view.WriteFromEntity(entity);
            _views[entity.Id] = view;
        }

        private void OnEntityDied(BattleEntity entity)
        {
            if (!Object.HasStateAuthority) return;
            if (!_views.TryGetValue(entity.Id, out NetworkedBattleEntityView view)) return;

            Runner.Despawn(view.Object);
            _views.Remove(entity.Id);
        }

        private void OnMatchEnded(BattleMatchResult result)
        {
            NetOutcome = result.Outcome switch
            {
                MatchOutcome.Decisive => MatchOutcomeNet.Decisive,
                MatchOutcome.Draw => MatchOutcomeNet.Draw,
                _ => MatchOutcomeNet.InProgress,
            };
            NetWinnerSlot = result.Winner?.Value ?? 0;

            // Module 5 hook: report the result to PlayFab (stats/leaderboards/rank/mail) here
            // once the Backend module exists — this is the one place a match's outcome is final.
        }

        private static MatchPhaseNet ToNet(MatchPhase phase) => phase switch
        {
            MatchPhase.PreMatch => MatchPhaseNet.PreMatch,
            MatchPhase.Battle => MatchPhaseNet.Battle,
            MatchPhase.Overtime => MatchPhaseNet.Overtime,
            _ => MatchPhaseNet.Ended,
        };

        // --- Authority-side request forwarding, called by BattlePlayerNetworkController's RPCs. ---

        public GameResult RequestDeployTroop(PlayerSlot slot, CardId cardId, Vector2Fix position) => _simulation.TryDeployTroop(slot, cardId, position);
        public GameResult RequestDeployBuilding(PlayerSlot slot, CardId cardId, Vector2Fix position) => _simulation.TryDeployBuilding(slot, cardId, position);
        public GameResult RequestCastSpell(PlayerSlot slot, CardId cardId, Vector2Fix position) => _simulation.TryCastSpell(slot, cardId, position);
        public GameResult RequestActivateAbility(PlayerSlot slot, EntityId entityId) => _simulation.TryActivateChampionAbility(slot, entityId);
    }

    /// <summary>Byte-backed mirror of <see cref="MatchPhase"/> for reliable, minimal-size networked replication.</summary>
    public enum MatchPhaseNet : byte { PreMatch, Battle, Overtime, Ended }

    /// <summary>Byte-backed mirror of <see cref="MatchOutcome"/>.</summary>
    public enum MatchOutcomeNet : byte { InProgress, Decisive, Draw }
}
#endif
