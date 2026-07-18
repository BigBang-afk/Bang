using System.ComponentModel;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>
/// A flat, typed projection of a <see cref="Domain.Entities.Stock"/> row for the inventory
/// DataGridView. Binding to strongly-typed properties (rather than pre-formatted strings, as
/// most of this app's simpler grids do) is what lets <see cref="Controls.SortableBindingList{T}"/>
/// sort numeric/date columns correctly instead of alphabetically.
/// </summary>
public class StockRowViewModel
{
    public int StockId { get; }
    public string ItemCode { get; }
    public string ItemName { get; }
    public string Category { get; }
    public string MetalType { get; }
    public string Purity { get; }
    public decimal NetWeight { get; }
    public decimal FineGoldWeight { get; }
    public int Quantity { get; }
    public decimal PurchaseValue { get; }
    public decimal SaleRate { get; }
    public string ItemStatus { get; }
    public string Karigar { get; }
    public string Supplier { get; }
    public string Brand { get; }
    public string DesignNumber { get; }
    public string ShelfNumber { get; }
    public string Gender { get; }
    public bool IsLowStock { get; }
    public DateTime CreatedDate { get; }

    /// <summary>Not shown as a grid column (see <see cref="BrowsableAttribute"/>) - used by the
    /// Inventory screen to get back to the real entity for editing/status changes.</summary>
    [Browsable(false)]
    public Domain.Entities.Stock Source { get; }

    public StockRowViewModel(Domain.Entities.Stock stock)
    {
        Source = stock;
        StockId = stock.StockId;
        ItemCode = stock.ItemCode;
        ItemName = stock.ItemName;
        Category = stock.Category?.CategoryName ?? string.Empty;
        MetalType = stock.MetalType;
        Purity = stock.Purity;
        NetWeight = stock.NetWeight;
        FineGoldWeight = stock.FineGoldWeight;
        Quantity = stock.Quantity;
        PurchaseValue = stock.PurchaseValue;
        SaleRate = stock.SaleRate;
        ItemStatus = stock.ItemStatus;
        Karigar = stock.Karigar?.FullName ?? string.Empty;
        Supplier = stock.Supplier?.CompanyName ?? string.Empty;
        Brand = stock.Brand ?? string.Empty;
        DesignNumber = stock.DesignNumber ?? string.Empty;
        ShelfNumber = stock.ShelfNumber ?? string.Empty;
        Gender = stock.Gender;
        IsLowStock = stock.IsLowStock;
        CreatedDate = stock.CreatedDate;
    }
}
