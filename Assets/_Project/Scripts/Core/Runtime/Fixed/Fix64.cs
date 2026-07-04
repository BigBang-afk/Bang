using System;
using System.Runtime.CompilerServices;

namespace RoyaleClash.Core.Fixed
{
    /// <summary>
    /// Deterministic Q32.32 fixed-point number. Used everywhere inside the battle
    /// simulation instead of float/double so replays and client/server state never
    /// diverge due to platform floating-point differences.
    /// </summary>
    [Serializable]
    public readonly struct Fix64 : IEquatable<Fix64>, IComparable<Fix64>
    {
        private const int FractionalBits = 32;
        private const long One = 1L << FractionalBits;

        public static readonly Fix64 Zero = FromRaw(0);
        public static readonly Fix64 OneValue = FromRaw(One);
        public static readonly Fix64 Half = FromRaw(One >> 1);
        public static readonly Fix64 MaxValue = FromRaw(long.MaxValue);
        public static readonly Fix64 MinValue = FromRaw(long.MinValue);

        public readonly long RawValue;

        private Fix64(long raw) => RawValue = raw;

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static Fix64 FromRaw(long raw) => new Fix64(raw);

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static Fix64 FromInt(int value) => new Fix64((long)value << FractionalBits);

        public static Fix64 FromFloat(float value) => new Fix64((long)Math.Round(value * One));

        public double ToDouble() => (double)RawValue / One;
        public float ToFloat() => (float)ToDouble();
        public int ToIntFloor() => (int)(RawValue >> FractionalBits);

        public static Fix64 operator +(Fix64 a, Fix64 b) => new Fix64(a.RawValue + b.RawValue);
        public static Fix64 operator -(Fix64 a, Fix64 b) => new Fix64(a.RawValue - b.RawValue);
        public static Fix64 operator -(Fix64 a) => new Fix64(-a.RawValue);

        public static Fix64 operator *(Fix64 a, Fix64 b)
        {
            // 64x64 -> 128 bit multiply via split high/low 32-bit halves (no Int128
            // dependency, so this compiles under Unity's Mono/IL2CPP toolchains).
            long ai = a.RawValue >> FractionalBits;
            ulong af = (ulong)(a.RawValue & 0xFFFFFFFFL);
            long bi = b.RawValue >> FractionalBits;
            ulong bf = (ulong)(b.RawValue & 0xFFFFFFFFL);

            ulong ff = af * bf;
            long fi = (long)af * bi;
            long if_ = ai * (long)bf;
            long ii = ai * bi;

            long result = (ii << FractionalBits) + fi + if_ + (long)(ff >> FractionalBits);
            return new Fix64(result);
        }

        public static Fix64 operator /(Fix64 a, Fix64 b)
        {
            if (b.RawValue == 0)
                throw new DivideByZeroException("Fix64 division by zero.");

            // Long division computed in IEEE 754 double precision then rounded back
            // to Q32.32; deterministic across the platforms Unity targets and
            // sufficiently accurate for gameplay values (stats, timers, positions).
            double result = a.ToDouble() / b.ToDouble();
            return FromRaw((long)Math.Round(result * One));
        }

        public static bool operator ==(Fix64 a, Fix64 b) => a.RawValue == b.RawValue;
        public static bool operator !=(Fix64 a, Fix64 b) => a.RawValue != b.RawValue;
        public static bool operator <(Fix64 a, Fix64 b) => a.RawValue < b.RawValue;
        public static bool operator >(Fix64 a, Fix64 b) => a.RawValue > b.RawValue;
        public static bool operator <=(Fix64 a, Fix64 b) => a.RawValue <= b.RawValue;
        public static bool operator >=(Fix64 a, Fix64 b) => a.RawValue >= b.RawValue;

        public static implicit operator Fix64(int value) => FromInt(value);

        public static Fix64 Sqrt(Fix64 value)
        {
            if (value.RawValue < 0)
                throw new ArgumentOutOfRangeException(nameof(value), "Cannot take sqrt of a negative Fix64.");
            if (value.RawValue == 0)
                return Zero;

            // Newton-Raphson, deterministic across platforms (integer-only iteration).
            double approx = Math.Sqrt(value.ToDouble());
            Fix64 x = FromFloat((float)approx);
            for (int i = 0; i < 4; i++)
            {
                if (x.RawValue == 0) break;
                x = (x + value / x) / FromInt(2);
            }
            return x;
        }

        public static Fix64 Abs(Fix64 value) => value.RawValue < 0 ? -value : value;
        public static Fix64 Min(Fix64 a, Fix64 b) => a.RawValue < b.RawValue ? a : b;
        public static Fix64 Max(Fix64 a, Fix64 b) => a.RawValue > b.RawValue ? a : b;
        public static Fix64 Clamp(Fix64 value, Fix64 min, Fix64 max) => Max(min, Min(max, value));
        public static Fix64 Lerp(Fix64 a, Fix64 b, Fix64 t) => a + (b - a) * Clamp(t, Zero, OneValue);

        public bool Equals(Fix64 other) => RawValue == other.RawValue;
        public override bool Equals(object obj) => obj is Fix64 other && Equals(other);
        public override int GetHashCode() => RawValue.GetHashCode();
        public int CompareTo(Fix64 other) => RawValue.CompareTo(other.RawValue);
        public override string ToString() => ToDouble().ToString("F4");
    }
}
