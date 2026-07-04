using System;

namespace RoyaleClash.Core.Fixed
{
    /// <summary>Deterministic 2D vector built on <see cref="Fix64"/>, used for all battle-simulation positions.</summary>
    [Serializable]
    public readonly struct Vector2Fix : IEquatable<Vector2Fix>
    {
        public static readonly Vector2Fix Zero = new Vector2Fix(Fix64.Zero, Fix64.Zero);

        public readonly Fix64 X;
        public readonly Fix64 Y;

        public Vector2Fix(Fix64 x, Fix64 y)
        {
            X = x;
            Y = y;
        }

        public static Vector2Fix operator +(Vector2Fix a, Vector2Fix b) => new Vector2Fix(a.X + b.X, a.Y + b.Y);
        public static Vector2Fix operator -(Vector2Fix a, Vector2Fix b) => new Vector2Fix(a.X - b.X, a.Y - b.Y);
        public static Vector2Fix operator -(Vector2Fix a) => new Vector2Fix(-a.X, -a.Y);
        public static Vector2Fix operator *(Vector2Fix a, Fix64 scalar) => new Vector2Fix(a.X * scalar, a.Y * scalar);
        public static Vector2Fix operator *(Fix64 scalar, Vector2Fix a) => a * scalar;

        public Fix64 SqrMagnitude => X * X + Y * Y;
        public Fix64 Magnitude => Fix64.Sqrt(SqrMagnitude);

        public static Fix64 Distance(Vector2Fix a, Vector2Fix b) => (a - b).Magnitude;
        public static Fix64 DistanceSquared(Vector2Fix a, Vector2Fix b) => (a - b).SqrMagnitude;

        public Vector2Fix Normalized()
        {
            Fix64 mag = Magnitude;
            return mag == Fix64.Zero ? Zero : new Vector2Fix(X / mag, Y / mag);
        }

        /// <summary>Moves <paramref name="current"/> toward <paramref name="target"/> by at most <paramref name="maxDelta"/>, without overshooting.</summary>
        public static Vector2Fix MoveTowards(Vector2Fix current, Vector2Fix target, Fix64 maxDelta)
        {
            Vector2Fix delta = target - current;
            Fix64 dist = delta.Magnitude;
            if (dist <= maxDelta || dist == Fix64.Zero)
                return target;
            return current + delta * (maxDelta / dist);
        }

        public bool Equals(Vector2Fix other) => X == other.X && Y == other.Y;
        public override bool Equals(object obj) => obj is Vector2Fix other && Equals(other);
        public override int GetHashCode() => HashCode.Combine(X.RawValue, Y.RawValue);
        public override string ToString() => $"({X}, {Y})";
    }
}
