import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createCustomer,
  updateCustomer,
  archiveCustomer,
  changeCustomerStatus,
  changeCustomerType,
  findPossibleDuplicates,
  searchCustomers,
  getCustomerProfile,
  listCustomers,
  exportAllCustomers,
  DuplicateCustomerPhoneError,
} from "@/services/customer.service";
import { parseCustomerCode, formatCustomerCode } from "@/lib/customer-code";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(): string {
  return `+92300${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

describe("Customer creation (Test 1)", () => {
  it("creates a customer combining first + last name, defaulting to REGULAR/ACTIVE", async () => {
    const customer = await createCustomer(
      { firstName: "Ayesha", lastName: "Khan", phone: uniquePhone() },
      userId,
    );
    expect(customer.name).toBe("Ayesha Khan");
    expect(customer.customerType).toBe("REGULAR");
    expect(customer.status).toBe("ACTIVE");
    expect(customer.outstandingBalance.toNumber()).toBe(0);
  });

  it("writes a CUSTOMER_CREATED audit log (Test 20)", async () => {
    const customer = await createCustomer({ firstName: "Bilal", phone: uniquePhone() }, userId);
    const logs = await prisma.auditLog.findMany({
      where: { entity: "Customer", entityId: customer.id, action: "CUSTOMER_CREATED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects a second customer with the same phone number", async () => {
    const phone = uniquePhone();
    await createCustomer({ firstName: "First", phone }, userId);
    await expect(createCustomer({ firstName: "Second", phone }, userId)).rejects.toThrow(
      DuplicateCustomerPhoneError,
    );
  });
});

describe("Customer code uniqueness (Test 2)", () => {
  it("assigns a well-formed, unique, increasing ZJC- code on every create", async () => {
    const first = await createCustomer({ firstName: "Code One", phone: uniquePhone() }, userId);
    const second = await createCustomer({ firstName: "Code Two", phone: uniquePhone() }, userId);

    expect(first.customerCode).toMatch(/^ZJC-\d{6,}$/);
    expect(second.customerCode).toMatch(/^ZJC-\d{6,}$/);
    expect(parseCustomerCode(second.customerCode)!).toBeGreaterThan(parseCustomerCode(first.customerCode)!);
  });

  it("never produces a duplicate code under concurrent creation", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => createCustomer({ firstName: `Concurrent ${i}`, phone: uniquePhone() }, userId)),
    );
    const codes = results.map((r) => parseCustomerCode(r.customerCode));
    expect(new Set(codes).size).toBe(results.length);
  });

  it("does not confuse a customer code with a barcode or invoice number", () => {
    expect(parseCustomerCode("ZJ-000001")).toBeNull();
    expect(parseCustomerCode("ZJ-INV-000001")).toBeNull();
    expect(parseCustomerCode(formatCustomerCode(42))).toBe(42);
  });
});

describe("Duplicate customer protection (Test 3)", () => {
  it("flags a possible duplicate by matching phone against an existing secondary phone", async () => {
    const primary = uniquePhone();
    const secondary = uniquePhone();
    const created = await createCustomer(
      { firstName: "Duplicate Source", phone: primary, secondaryPhone: secondary },
      userId,
    );

    const matches = await findPossibleDuplicates({ phone: secondary });
    expect(matches.some((m) => m.id === created.id)).toBe(true);
  });

  it("flags a possible duplicate by matching email", async () => {
    const email = `dup-${uniqueSuffix()}@example.com`;
    const created = await createCustomer({ firstName: "Email Match", phone: uniquePhone(), email }, userId);

    const matches = await findPossibleDuplicates({ phone: uniquePhone(), email });
    expect(matches.some((m) => m.id === created.id)).toBe(true);
  });

  it("reports no duplicates for a genuinely new phone/email", async () => {
    const matches = await findPossibleDuplicates({ phone: uniquePhone(), email: `none-${uniqueSuffix()}@example.com` });
    expect(matches).toHaveLength(0);
  });
});

describe("Customer search (Test 4)", () => {
  it("finds a customer by partial, case-insensitive name", async () => {
    const marker = `Findable Customer ${uniqueSuffix()}`;
    await createCustomer({ firstName: marker, phone: uniquePhone() }, userId);
    const results = await searchCustomers("findable customer");
    expect(results.some((r) => r.name === marker)).toBe(true);
  });

  it("finds a customer by exact customer code", async () => {
    const created = await createCustomer({ firstName: "Code Search", phone: uniquePhone() }, userId);
    const results = await searchCustomers(created.customerCode);
    expect(results.some((r) => r.id === created.id)).toBe(true);
  });

  it("finds a customer by phone", async () => {
    const phone = uniquePhone();
    const created = await createCustomer({ firstName: "Phone Search", phone }, userId);
    const results = await searchCustomers(phone);
    expect(results.some((r) => r.id === created.id)).toBe(true);
  });
});

describe("Customer profile (Test 5)", () => {
  it("returns the full profile including createdBy and a null preference by default", async () => {
    const created = await createCustomer({ firstName: "Profile Test", phone: uniquePhone() }, userId);
    const profile = await getCustomerProfile(created.id);
    expect(profile).not.toBeNull();
    expect(profile!.createdBy.id).toBe(userId);
    expect(profile!.preference).toBeNull();
  });

  it("returns null for a non-existent customer", async () => {
    const profile = await getCustomerProfile("00000000-0000-0000-0000-000000000000");
    expect(profile).toBeNull();
  });
});

describe("Customer edit / archive / status / type (audit logs, Test 20)", () => {
  it("updates a customer and writes CUSTOMER_UPDATED", async () => {
    const created = await createCustomer({ firstName: "Editable", phone: uniquePhone() }, userId);
    await updateCustomer(
      { id: created.id, firstName: "Edited", lastName: "Name", phone: created.phone },
      userId,
    );
    const profile = await getCustomerProfile(created.id);
    expect(profile!.name).toBe("Edited Name");

    const logs = await prisma.auditLog.findMany({
      where: { entity: "Customer", entityId: created.id, action: "CUSTOMER_UPDATED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("archives a customer to INACTIVE and writes CUSTOMER_ARCHIVED", async () => {
    const created = await createCustomer({ firstName: "Archivable", phone: uniquePhone() }, userId);
    await archiveCustomer(created.id, userId);
    const profile = await getCustomerProfile(created.id);
    expect(profile!.status).toBe("INACTIVE");

    const logs = await prisma.auditLog.findMany({
      where: { entity: "Customer", entityId: created.id, action: "CUSTOMER_ARCHIVED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("never deletes a customer, even after archiving", async () => {
    const created = await createCustomer({ firstName: "NeverDeleted", phone: uniquePhone() }, userId);
    await archiveCustomer(created.id, userId);
    const row = await prisma.customer.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
  });

  it("changes status and writes CUSTOMER_STATUS_CHANGED", async () => {
    const created = await createCustomer({ firstName: "Blockable", phone: uniquePhone() }, userId);
    await changeCustomerStatus(created.id, "BLOCKED", userId);
    const profile = await getCustomerProfile(created.id);
    expect(profile!.status).toBe("BLOCKED");
    const logs = await prisma.auditLog.findMany({
      where: { entity: "Customer", entityId: created.id, action: "CUSTOMER_STATUS_CHANGED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("changes type and writes CUSTOMER_TYPE_CHANGED", async () => {
    const created = await createCustomer({ firstName: "Wholesaler", phone: uniquePhone() }, userId);
    await changeCustomerType(created.id, "WHOLESALE", userId);
    const profile = await getCustomerProfile(created.id);
    expect(profile!.customerType).toBe("WHOLESALE");
    const logs = await prisma.auditLog.findMany({
      where: { entity: "Customer", entityId: created.id, action: "CUSTOMER_TYPE_CHANGED" },
    });
    expect(logs).toHaveLength(1);
  });
});

describe("All Customers list — filters, sort, pagination", () => {
  it("filters by customer type and status", async () => {
    const marker = `ListFilter-${uniqueSuffix()}`;
    const vip = await createCustomer(
      { firstName: marker, phone: uniquePhone(), customerType: "VIP" },
      userId,
    );

    const { rows } = await listCustomers({ search: marker, customerType: "VIP" });
    expect(rows.some((r) => r.id === vip.id)).toBe(true);
  });

  it("paginates results consistently", async () => {
    const marker = `PageMarker-${uniqueSuffix()}`;
    for (let i = 0; i < 5; i++) {
      await createCustomer({ firstName: `${marker} ${i}`, phone: uniquePhone() }, userId);
    }
    const pageSize = 2;
    const seen = new Set<string>();
    let total = 0;
    for (let page = 1; page <= 3; page++) {
      const result = await listCustomers({ search: marker, page, pageSize });
      total = result.total;
      for (const row of result.rows) seen.add(row.id);
    }
    expect(total).toBe(5);
    expect(seen.size).toBe(5);
  });
});

describe("Customer export (Test 18)", () => {
  it("includes every customer with the expected fields, unpaginated", async () => {
    const marker = `Export-${uniqueSuffix()}`;
    await createCustomer({ firstName: marker, phone: uniquePhone(), city: "Lahore" }, userId);

    const rows = await exportAllCustomers();
    const row = rows.find((r) => r.name === marker);
    expect(row).toBeDefined();
    expect(row!.city).toBe("Lahore");
    expect(row!.customerCode).toMatch(/^ZJC-\d{6,}$/);
  });
});
