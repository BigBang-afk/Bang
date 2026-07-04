using NUnit.Framework;
using RoyaleClash.Battle;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    public class ElixirPoolTests
    {
        [Test]
        public void RegeneratesOneElixirAfterConfiguredSeconds()
        {
            var pool = new ElixirPool(Fix64.FromInt(0), Fix64.FromInt(10), Fix64.FromFloat(2.8f));
            pool.Tick(Fix64.FromFloat(2.8f));
            Assert.AreEqual(1, pool.Current.ToIntFloor());
        }

        [Test]
        public void DoesNotExceedMax()
        {
            var pool = new ElixirPool(Fix64.FromInt(10), Fix64.FromInt(10), Fix64.FromFloat(2.8f));
            pool.Tick(Fix64.FromInt(100));
            Assert.AreEqual(10, pool.Current.ToIntFloor());
        }

        [Test]
        public void TrySpend_FailsWhenInsufficient()
        {
            var pool = new ElixirPool(Fix64.FromInt(2), Fix64.FromInt(10), Fix64.FromFloat(2.8f));
            Assert.IsFalse(pool.TrySpend(Fix64.FromInt(3)));
            Assert.AreEqual(2, pool.Current.ToIntFloor());
        }

        [Test]
        public void TrySpend_SucceedsAndDeducts()
        {
            var pool = new ElixirPool(Fix64.FromInt(5), Fix64.FromInt(10), Fix64.FromFloat(2.8f));
            Assert.IsTrue(pool.TrySpend(Fix64.FromInt(3)));
            Assert.AreEqual(2, pool.Current.ToIntFloor());
        }

        [Test]
        public void FasterRegenRate_AccumulatesFaster()
        {
            var pool = new ElixirPool(Fix64.FromInt(0), Fix64.FromInt(10), Fix64.FromFloat(2.8f));
            pool.SetRegenRate(Fix64.FromFloat(1.4f)); // double elixir rate
            pool.Tick(Fix64.FromFloat(1.4f));
            Assert.AreEqual(1, pool.Current.ToIntFloor());
        }
    }
}
