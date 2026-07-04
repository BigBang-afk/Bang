#if ROYALECLASH_PHOTON_FUSION
using System.Collections.Generic;
using Fusion;
using RoyaleClash.Core;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Authority-only PlayerRef &lt;-&gt; PlayerSlot mapping, assigned in join order. This is
    /// the anchor of server validation: an incoming RPC's <c>PlayerRef</c> comes from Fusion's
    /// own authenticated connection, never from a value the client supplies — so resolving a
    /// request's PlayerSlot always goes through this registry, never a caller-passed slot id.
    /// </summary>
    public sealed class NetworkPlayerRegistry
    {
        private readonly Dictionary<PlayerRef, PlayerSlot> _slotsByPlayer = new Dictionary<PlayerRef, PlayerSlot>();
        private byte _nextSlot;

        public PlayerSlot AssignSlot(PlayerRef player)
        {
            if (_slotsByPlayer.TryGetValue(player, out PlayerSlot existing))
                return existing;

            var slot = new PlayerSlot(_nextSlot++);
            _slotsByPlayer[player] = slot;
            return slot;
        }

        public bool TryGetSlot(PlayerRef player, out PlayerSlot slot) => _slotsByPlayer.TryGetValue(player, out slot);

        public void Remove(PlayerRef player) => _slotsByPlayer.Remove(player);

        public int Count => _slotsByPlayer.Count;
    }
}
#endif
