using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Backend.Local;

namespace RoyaleClash.Tests.EditMode
{
    public class LocalInventoryServiceTests
    {
        [Test]
        public async Task GrantItems_AccumulatesAcrossCalls()
        {
            var inventory = new LocalInventoryService();
            await inventory.GrantItemsAsync(new List<InventoryItemStack> { new InventoryItemStack("gold", 100) });
            await inventory.GrantItemsAsync(new List<InventoryItemStack> { new InventoryItemStack("gold", 50) });

            GameResult<IReadOnlyList<InventoryItemStack>> result = await inventory.GetInventoryAsync();

            Assert.AreEqual(150, result.Value.Single(i => i.ItemId == "gold").Amount);
        }

        [Test]
        public async Task ConsumeItems_WithSufficientAmount_Succeeds()
        {
            var inventory = new LocalInventoryService();
            await inventory.GrantItemsAsync(new List<InventoryItemStack> { new InventoryItemStack("card_x", 10) });

            GameResult result = await inventory.ConsumeItemsAsync(new List<InventoryItemStack> { new InventoryItemStack("card_x", 4) });

            Assert.IsTrue(result.Success);
            GameResult<IReadOnlyList<InventoryItemStack>> inv = await inventory.GetInventoryAsync();
            Assert.AreEqual(6, inv.Value.Single(i => i.ItemId == "card_x").Amount);
        }

        [Test]
        public async Task ConsumeItems_WithInsufficientAmount_FailsAndDoesNotPartiallyConsume()
        {
            var inventory = new LocalInventoryService();
            await inventory.GrantItemsAsync(new List<InventoryItemStack>
            {
                new InventoryItemStack("card_x", 2),
                new InventoryItemStack("gold", 1000),
            });

            GameResult result = await inventory.ConsumeItemsAsync(new List<InventoryItemStack>
            {
                new InventoryItemStack("card_x", 5), // not enough
                new InventoryItemStack("gold", 100),
            });

            Assert.IsFalse(result.Success);
            GameResult<IReadOnlyList<InventoryItemStack>> inv = await inventory.GetInventoryAsync();
            Assert.AreEqual(1000, inv.Value.Single(i => i.ItemId == "gold").Amount, "Gold should not have been partially consumed when the overall request failed.");
        }
    }
}
