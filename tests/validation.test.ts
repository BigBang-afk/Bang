import { describe, expect, it } from "vitest";
import { leadInputSchema } from "@/lib/validation";

const base = { name: "Test Lead", phone: "+1 555 010 0000", property_interest: "2-bed apartment" };

describe("lead input validation", () => {
  it("accepts a minimal valid lead and turns empty optionals into null", () => {
    const r = leadInputSchema.parse({ ...base, budget: "  ", email: "" });
    expect(r.name).toBe("Test Lead");
    expect(r.budget).toBeNull();
    expect(r.email).toBeNull();
  });

  it("requires name and property interest", () => {
    const r = leadInputSchema.safeParse({ ...base, name: " ", property_interest: "" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("name");
    expect(paths).toContain("property_interest");
  });

  it("requires at least one contact method", () => {
    const r = leadInputSchema.safeParse({ name: "A", property_interest: "B" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toMatch(/phone number or an email/);
  });

  it("rejects malformed email and phone", () => {
    expect(leadInputSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...base, phone: "call me" }).success).toBe(false);
  });

  it("strips control characters", () => {
    const r = leadInputSchema.parse({ ...base, notes: "hello\u0000\u0007 world" });
    expect(r.notes).toBe("hello world");
  });
});
