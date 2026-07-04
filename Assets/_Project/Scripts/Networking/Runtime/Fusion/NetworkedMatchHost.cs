#if ROYALECLASH_PHOTON_FUSION
using System;
using System.Collections.Generic;
using System.Linq;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Client-side <see cref="IMatchHost"/>: translates requests into RPCs on the local
    /// player's <see cref="BattlePlayerNetworkController"/> and reads entity state from
    /// replicated <see cref="NetworkedBattleEntityView"/> objects — there is no local
    /// BattleSimulation on a client, by design (see BattleSimulationRunner).
    /// </summary>
    public sealed class NetworkedMatchHost : IMatchHost
    {
        public MatchMode Mode { get; }
        public PlayerSlot LocalPlayerSlot { get; }

        private readonly BattlePlayerNetworkController _localController;
        private readonly BattleSimulationRunner _runner;
        private readonly List<NetworkedBattleEntityView> _knownViews;

        // Not currently raised: NetworkedBattleEntityView objects are spawned/despawned by
        // Fusion's own object lifecycle, which this class doesn't hook into (that would need a
        // client-side registry keyed to Spawned()/Despawned() callbacks). Module 7's rendering
        // loop is expected to diff EntitySnapshots frame-to-frame instead, which is simpler and
        // just as correct for this genre's entity counts. Kept on the interface for parity with
        // PracticeMatchHost; wire these up if a push-based model turns out to be worth it.
        public event Action<BattleEntitySnapshot> EntitySpawned;
        public event Action<BattleEntitySnapshot> EntityDied;
        public event Action<BattleMatchResult> MatchEnded;

        public NetworkedMatchHost(MatchMode mode, PlayerSlot localSlot, BattlePlayerNetworkController localController,
            BattleSimulationRunner runner, List<NetworkedBattleEntityView> knownViews)
        {
            Mode = mode;
            LocalPlayerSlot = localSlot;
            _localController = localController;
            _runner = runner;
            _knownViews = knownViews;
        }

        public MatchPhase Phase => _runner.NetPhase switch
        {
            MatchPhaseNet.PreMatch => MatchPhase.PreMatch,
            MatchPhaseNet.Battle => MatchPhase.Battle,
            MatchPhaseNet.Overtime => MatchPhase.Overtime,
            _ => MatchPhase.Ended,
        };

        public BattleMatchResult Result
        {
            get
            {
                if (_runner.NetOutcome == MatchOutcomeNet.InProgress) return BattleMatchResult.InProgress;
                if (_runner.NetOutcome == MatchOutcomeNet.Draw) return BattleMatchResult.Draw("Match ended in a draw.");
                return BattleMatchResult.Decisive(new PlayerSlot(_runner.NetWinnerSlot), "Match decided.");
            }
        }

        public IReadOnlyList<BattleEntitySnapshot> EntitySnapshots => _knownViews.Select(v => v.ToSnapshot()).ToList();

        // The opponent's Elixir is intentionally hidden (matches genre convention); only the
        // local player's own Elixir would need a per-player [Networked] mirror on
        // BattlePlayerNetworkController — left as a follow-up once Module 7's UI needs it.
        public Fix64 GetElixir(PlayerSlot slot) => Fix64.Zero;

        public int GetCrowns(PlayerSlot slot) => slot.Value == 0 ? _runner.NetCrownsA : _runner.NetCrownsB;

        public GameResult RequestDeployTroop(CardId cardId, Vector2Fix position)
        {
            _localController.RPC_RequestDeployTroop(cardId.Value, position.ToUnityVector2());
            return GameResult.Successful; // optimistic; authoritative result arrives via RequestAcknowledged.
        }

        public GameResult RequestDeployBuilding(CardId cardId, Vector2Fix position)
        {
            _localController.RPC_RequestDeployBuilding(cardId.Value, position.ToUnityVector2());
            return GameResult.Successful;
        }

        public GameResult RequestCastSpell(CardId cardId, Vector2Fix position)
        {
            _localController.RPC_RequestCastSpell(cardId.Value, position.ToUnityVector2());
            return GameResult.Successful;
        }

        public GameResult RequestActivateChampionAbility(EntityId championEntityId)
        {
            _localController.RPC_RequestActivateAbility(championEntityId.Value);
            return GameResult.Successful;
        }

        /// <summary>No-op: the State Authority ticks BattleSimulationRunner independently via FixedUpdateNetwork.</summary>
        public void Tick(Fix64 dt) { }
    }
}
#endif
