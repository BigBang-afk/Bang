import { beforeAll, describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { getSaleById } from "@/services/sale.service";
import { getInvoiceBusinessInfo } from "@/services/sales-settings.service";
import { InvoicePdfDocument } from "@/components/pos/invoice-pdf-document";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

describe("PDF invoice generation (Test 19)", () => {
  it("renders a real, non-empty PDF with a valid PDF header for a completed sale", async () => {
    const created = await createInventoryItem(
      {
        productName: `PDF Test Item ${uniqueSuffix()}`,
        categoryId,
        purity: "K22",
        netWeight: 10,
        goldRate: 40000,
        wastageType: "PERCENTAGE",
        wastagePercent: 5,
        sellingPrice: 500000,
      },
      userId,
    );

    const result = await completeSale(
      { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const sale = await getSaleById(result.id);
    const business = await getInvoiceBusinessInfo();
    expect(sale).not.toBeNull();

    const buffer = await renderToBuffer(InvoicePdfDocument({ sale: sale!, business }));

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  });
});
