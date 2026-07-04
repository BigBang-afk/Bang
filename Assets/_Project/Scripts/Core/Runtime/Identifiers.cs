using System;

namespace RoyaleClash.Core
{
    /// <summary>Stable identifier for a card/troop/spell/building definition asset.</summary>
    [Serializable]
    public readonly struct CardId : IEquatable<CardId>
    {
        public readonly string Value;
        public CardId(string value) => Value = value;
        public bool Equals(CardId other) => string.Equals(Value, other.Value, StringComparison.Ordinal);
        public override bool Equals(object obj) => obj is CardId other && Equals(other);
        public override int GetHashCode() => Value?.GetHashCode() ?? 0;
        public override string ToString() => Value;
        public static bool operator ==(CardId a, CardId b) => a.Equals(b);
        public static bool operator !=(CardId a, CardId b) => !a.Equals(b);
    }

    /// <summary>Runtime identifier for a spawned battle entity (troop, building, tower).</summary>
    [Serializable]
    public readonly struct EntityId : IEquatable<EntityId>
    {
        public readonly int Value;
        public EntityId(int value) => Value = value;
        public static readonly EntityId Invalid = new EntityId(-1);
        public bool IsValid => Value >= 0;
        public bool Equals(EntityId other) => Value == other.Value;
        public override bool Equals(object obj) => obj is EntityId other && Equals(other);
        public override int GetHashCode() => Value;
        public override string ToString() => $"Entity#{Value}";
        public static bool operator ==(EntityId a, EntityId b) => a.Equals(b);
        public static bool operator !=(EntityId a, EntityId b) => !a.Equals(b);
    }

    /// <summary>Identifies one of the two (or four, in 2v2) match participants.</summary>
    [Serializable]
    public readonly struct PlayerSlot : IEquatable<PlayerSlot>
    {
        public readonly byte Value;
        public PlayerSlot(byte value) => Value = value;
        public bool Equals(PlayerSlot other) => Value == other.Value;
        public override bool Equals(object obj) => obj is PlayerSlot other && Equals(other);
        public override int GetHashCode() => Value;
        public static bool operator ==(PlayerSlot a, PlayerSlot b) => a.Equals(b);
        public static bool operator !=(PlayerSlot a, PlayerSlot b) => !a.Equals(b);
    }

    /// <summary>PlayFab-issued account identifier, opaque to gameplay code.</summary>
    [Serializable]
    public readonly struct PlayerAccountId : IEquatable<PlayerAccountId>
    {
        public readonly string Value;
        public PlayerAccountId(string value) => Value = value;
        public bool Equals(PlayerAccountId other) => string.Equals(Value, other.Value, StringComparison.Ordinal);
        public override bool Equals(object obj) => obj is PlayerAccountId other && Equals(other);
        public override int GetHashCode() => Value?.GetHashCode() ?? 0;
        public override string ToString() => Value;
    }
}
