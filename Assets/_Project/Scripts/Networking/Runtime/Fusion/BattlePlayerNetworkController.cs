#if ROYALECLASH_PHOTON_FUSION
using Fusion;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;
using UnityEngine;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// One per player, owned by that player's InputAuthority. Every gameplay action a client
    /// can take is one of the RPCs below: the client never touches simulation state, it only
    /// asks the State Authority to try an action and gets an ack back with the result (so the
    /// UI can show "not enough Elixir" etc.). The PlayerSlot used server-side always comes
    /// from <c>info.Source</c> (Fusion's own authenticated caller), never from a value the
    /// client supplies — a modified client can lie about a card id or position, but it cannot
    /// claim to be the other player.
    /// </summary>
    public sealed class BattlePlayerNetworkController : NetworkBehaviour
    {
        [Networked] public byte AssignedSlotValue { get; set; }
        public PlayerSlot AssignedSlot => new PlayerSlot(AssignedSlotValue);

        [Rpc(RpcSources.InputAuthority, RpcTargets.StateAuthority)]
        public void RPC_RequestDeployTroop(string cardId, Vector2 position, RpcInfo info = default)
        {
            BattleSimulationRunner runner = FindRunner();
            GameResult result = runner != null
                ? runner.RequestDeployTroop(AssignedSlot, new CardId(cardId), position.ToVector2Fix())
                : GameResult.Fail("Match not ready.");
            RPC_AckDeploy(result.Success, result.Error ?? string.Empty);
        }

        [Rpc(RpcSources.InputAuthority, RpcTargets.StateAuthority)]
        public void RPC_RequestDeployBuilding(string cardId, Vector2 position, RpcInfo info = default)
        {
            BattleSimulationRunner runner = FindRunner();
            GameResult result = runner != null
                ? runner.RequestDeployBuilding(AssignedSlot, new CardId(cardId), position.ToVector2Fix())
                : GameResult.Fail("Match not ready.");
            RPC_AckDeploy(result.Success, result.Error ?? string.Empty);
        }

        [Rpc(RpcSources.InputAuthority, RpcTargets.StateAuthority)]
        public void RPC_RequestCastSpell(string cardId, Vector2 position, RpcInfo info = default)
        {
            BattleSimulationRunner runner = FindRunner();
            GameResult result = runner != null
                ? runner.RequestCastSpell(AssignedSlot, new CardId(cardId), position.ToVector2Fix())
                : GameResult.Fail("Match not ready.");
            RPC_AckDeploy(result.Success, result.Error ?? string.Empty);
        }

        [Rpc(RpcSources.InputAuthority, RpcTargets.StateAuthority)]
        public void RPC_RequestActivateAbility(int entityId, RpcInfo info = default)
        {
            BattleSimulationRunner runner = FindRunner();
            GameResult result = runner != null
                ? runner.RequestActivateAbility(AssignedSlot, new EntityId(entityId))
                : GameResult.Fail("Match not ready.");
            RPC_AckDeploy(result.Success, result.Error ?? string.Empty);
        }

        [Rpc(RpcSources.StateAuthority, RpcTargets.InputAuthority)]
        private void RPC_AckDeploy(NetworkBool success, string error)
        {
            RequestAcknowledged?.Invoke(success, error);
        }

        /// <summary>Local-only event the UI (Module 7) subscribes to for "not enough Elixir"-style feedback.</summary>
        public event System.Action<bool, string> RequestAcknowledged;

        // NetworkBehaviour already exposes a member named "Object" (the NetworkObject), so the
        // UnityEngine.Object call below must be fully qualified to avoid resolving to that instead.
        private static BattleSimulationRunner FindRunner() =>
            UnityEngine.Object.FindAnyObjectByType<BattleSimulationRunner>();
    }
}
#endif
