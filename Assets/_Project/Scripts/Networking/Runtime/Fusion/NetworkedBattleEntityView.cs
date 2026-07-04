#if ROYALECLASH_PHOTON_FUSION
using Fusion;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking.Fusion
{
    /// <summary>
    /// Networked mirror of one BattleEntity's presentation-relevant state. The State Authority
    /// spawns/despawns one of these per <see cref="BattleSimulation"/> entity (see
    /// <see cref="BattleSimulationRunner"/>) and writes to it every tick; remote clients read
    /// these [Networked] fields to drive visuals. No view/art logic lives here — that's
    /// Module 7/8's job, consuming <see cref="ToSnapshot"/> just like practice mode does.
    /// </summary>
    public sealed class NetworkedBattleEntityView : NetworkBehaviour
    {
        [Networked] public int EntityIdValue { get; private set; }
        [Networked] public EntityKind Kind { get; private set; }
        [Networked] public byte OwnerValue { get; private set; }
        [Networked] public Vector3 NetPosition { get; private set; }
        [Networked] public int NetHealth { get; private set; }
        [Networked] public int NetMaxHealth { get; private set; }

        public EntityId EntityId => new EntityId(EntityIdValue);
        public PlayerSlot Owner => new PlayerSlot(OwnerValue);

        /// <summary>Authority-only: called once right after Runner.Spawn.</summary>
        public void Initialize(EntityId id, EntityKind kind, PlayerSlot owner)
        {
            EntityIdValue = id.Value;
            Kind = kind;
            OwnerValue = owner.Value;
        }

        /// <summary>Authority-only: called every FixedUpdateNetwork tick to mirror the live entity's state.</summary>
        public void WriteFromEntity(BattleEntity entity)
        {
            if (entity == null) return;
            NetPosition = entity.Position.ToUnityVector3();
            NetHealth = entity.Health.ToIntFloor();
            NetMaxHealth = entity.MaxHealth.ToIntFloor();
        }

        public BattleEntitySnapshot ToSnapshot() => new BattleEntitySnapshot(
            EntityId, Kind, Owner, NetPosition.ToVector2Fix(), Fix64.FromInt(NetHealth), Fix64.FromInt(NetMaxHealth));
    }
}
#endif
