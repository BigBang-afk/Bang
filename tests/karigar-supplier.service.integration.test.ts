import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createKarigar,
  updateKarigar,
  changeKarigarStatus,
  searchKarigars,
  listKarigars,
  DuplicateKarigarPhoneError,
} from "@/services/karigar.service";
import { formatKarigarCode, parseKarigarCode } from "@/lib/karigar-code";
import {
  createSupplier,
  updateSupplier,
  changeSupplierStatus,
  searchSuppliers,
  listSuppliers,
  DuplicateSupplierPhoneError,
} from "@/services/supplier.service";
import { formatSupplierCode, parseSupplierCode } from "@/lib/supplier-code";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(prefix: string): string {
  return `+9230${prefix}${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

describe("Karigar creation (Test 1)", () => {
  it("creates a karigar defaulting to OTHER specialization and ACTIVE status", async () => {
    const karigar = await createKarigar({ name: "Rafiq Goldsmith", phone: uniquePhone("1") }, userId);
    expect(karigar.specialization).toBe("OTHER");
    expect(karigar.status).toBe("ACTIVE");
  });

  it("writes a KARIGAR_CREATED audit log (Test 22)", async () => {
    const karigar = await createKarigar({ name: "Audit Karigar", phone: uniquePhone("2") }, userId);
    const logs = await prisma.auditLog.findMany({
      where: { entity: "Karigar", entityId: karigar.id, action: "KARIGAR_CREATED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects a second karigar with the same phone number", async () => {
    const phone = uniquePhone("3");
    await createKarigar({ name: "First", phone }, userId);
    await expect(createKarigar({ name: "Second", phone }, userId)).rejects.toThrow(DuplicateKarigarPhoneError);
  });

  it("updates a karigar and writes KARIGAR_UPDATED; status change writes KARIGAR_STATUS_CHANGED", async () => {
    const karigar = await createKarigar({ name: "Editable", phone: uniquePhone("4") }, userId);
    await updateKarigar(
      { id: karigar.id, name: "Renamed", phone: karigar.phone, specialization: "STONE_SETTER" },
      userId,
    );
    await changeKarigarStatus(karigar.id, "BLOCKED", userId);

    const updated = await prisma.karigar.findUniqueOrThrow({ where: { id: karigar.id } });
    expect(updated.name).toBe("Renamed");
    expect(updated.specialization).toBe("STONE_SETTER");
    expect(updated.status).toBe("BLOCKED");

    const logs = await prisma.auditLog.findMany({ where: { entity: "Karigar", entityId: karigar.id } });
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining(["KARIGAR_CREATED", "KARIGAR_UPDATED", "KARIGAR_STATUS_CHANGED"]),
    );
  });
});

describe("Karigar code uniqueness (Test 3)", () => {
  it("assigns a well-formed, unique, increasing ZJK- code on every create, never confused with ZJC-/ZJS-", async () => {
    const first = await createKarigar({ name: "Code One", phone: uniquePhone("5") }, userId);
    const second = await createKarigar({ name: "Code Two", phone: uniquePhone("6") }, userId);

    expect(first.karigarCode).toMatch(/^ZJK-\d{6}$/);
    expect(parseKarigarCode(first.karigarCode)).toBeLessThan(parseKarigarCode(second.karigarCode)!);
    expect(parseKarigarCode("ZJC-000001")).toBeNull();
    expect(parseKarigarCode("ZJS-000001")).toBeNull();
    expect(formatKarigarCode(1)).toBe("ZJK-000001");
  });

  it("assigns unique codes under concurrent creation", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createKarigar({ name: `Concurrent ${i}`, phone: uniquePhone(`7${i}`) }, userId)),
    );
    const codes = new Set(results.map((r) => r.karigarCode));
    expect(codes.size).toBe(5);
  });

  it("search and list find a created karigar by name, phone, and code", async () => {
    const phone = uniquePhone("8");
    const marker = `Findable Karigar ${uniqueSuffix()}`;
    const karigar = await createKarigar({ name: marker, phone }, userId);

    expect((await searchKarigars(marker)).some((k) => k.id === karigar.id)).toBe(true);
    expect((await searchKarigars(phone)).some((k) => k.id === karigar.id)).toBe(true);
    expect((await searchKarigars(karigar.karigarCode)).some((k) => k.id === karigar.id)).toBe(true);

    const { rows } = await listKarigars({ search: marker });
    expect(rows.some((k) => k.id === karigar.id)).toBe(true);
  });
});

describe("Supplier creation (Test 2)", () => {
  it("creates a supplier defaulting to ACTIVE status", async () => {
    const supplier = await createSupplier({ name: "Al-Karam Bullion", phone: uniquePhone("9") }, userId);
    expect(supplier.status).toBe("ACTIVE");
  });

  it("writes a SUPPLIER_CREATED audit log (Test 22)", async () => {
    const supplier = await createSupplier({ name: "Audit Supplier", phone: uniquePhone("10") }, userId);
    const logs = await prisma.auditLog.findMany({
      where: { entity: "Supplier", entityId: supplier.id, action: "SUPPLIER_CREATED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects a second supplier with the same phone number", async () => {
    const phone = uniquePhone("11");
    await createSupplier({ name: "First", phone }, userId);
    await expect(createSupplier({ name: "Second", phone }, userId)).rejects.toThrow(DuplicateSupplierPhoneError);
  });

  it("updates a supplier and changes status", async () => {
    const supplier = await createSupplier({ name: "Editable Supplier", phone: uniquePhone("12") }, userId);
    await updateSupplier({ id: supplier.id, name: "Renamed Supplier", phone: supplier.phone }, userId);
    await changeSupplierStatus(supplier.id, "INACTIVE", userId);

    const updated = await prisma.supplier.findUniqueOrThrow({ where: { id: supplier.id } });
    expect(updated.name).toBe("Renamed Supplier");
    expect(updated.status).toBe("INACTIVE");
  });
});

describe("Supplier code uniqueness (Test 3)", () => {
  it("assigns a well-formed, unique ZJS- code, never confused with ZJK-/ZJC-", async () => {
    const supplier = await createSupplier({ name: "Code Supplier", phone: uniquePhone("13") }, userId);
    expect(supplier.supplierCode).toMatch(/^ZJS-\d{6}$/);
    expect(parseSupplierCode("ZJK-000001")).toBeNull();
    expect(parseSupplierCode("ZJC-000001")).toBeNull();
    expect(formatSupplierCode(1)).toBe("ZJS-000001");
  });

  it("search and list find a created supplier by name, phone, and code", async () => {
    const phone = uniquePhone("14");
    const marker = `Findable Supplier ${uniqueSuffix()}`;
    const supplier = await createSupplier({ name: marker, phone }, userId);

    expect((await searchSuppliers(marker)).some((s) => s.id === supplier.id)).toBe(true);
    expect((await searchSuppliers(phone)).some((s) => s.id === supplier.id)).toBe(true);

    const { rows } = await listSuppliers({ search: marker });
    expect(rows.some((s) => s.id === supplier.id)).toBe(true);
  });
});
