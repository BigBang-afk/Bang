import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/db";
import {
  createLead,
  getDashboardStats,
  getLeadDetail,
  listPendingFollowUps,
  markMessageSent,
  saveAIResult,
  scheduleFollowUp,
  setStatus,
  updateFollowUp,
  ConflictError,
} from "@/lib/leads";
import { leadInputSchema } from "@/lib/validation";
import { addDays, today } from "@/lib/dates";

const input = leadInputSchema.parse({ name: "Test Lead", email: "t@example.com", property_interest: "Villa" });
const ai = {
  immediate_response: "Hi Test, thanks for your enquiry.",
  follow_up_1_day: "Hi Test, just following up.",
  follow_up_3_days: "Hi Test, one last check-in.",
  lead_summary: "Test is interested in a villa.",
  suggested_next_action: "Ask about budget.",
  missing_information: ["Budget"],
};
const noWarnings = { immediate: [], follow_up_1d: [], follow_up_3d: [] };

beforeEach(() => resetDbForTests());

describe("lead workflow", () => {
  it("creates a lead as New with a creation activity", () => {
    const id = createLead(input);
    const d = getLeadDetail(id)!;
    expect(d.lead.status).toBe("New");
    expect(d.activities[0].type).toBe("created");
    expect(getDashboardStats().new).toBe(1);
  });

  it("sending the immediate response contacts the lead and schedules 1d/3d follow-ups", () => {
    const id = createLead(input);
    saveAIResult(id, ai, noWarnings);
    const immediate = getLeadDetail(id)!.messages.find((m) => m.kind === "immediate")!;
    markMessageSent(immediate.id);

    const d = getLeadDetail(id)!;
    expect(d.lead.status).toBe("Contacted");
    expect(d.lead.next_follow_up).toBe(addDays(today(), 1));
    expect(d.followUps.filter((f) => f.status === "pending").map((f) => f.kind).sort()).toEqual(["follow_up_1d", "follow_up_3d"]);
    expect(() => markMessageSent(immediate.id)).toThrow(ConflictError);
  });

  it("sending a follow-up message completes its scheduled follow-up", () => {
    const id = createLead(input);
    saveAIResult(id, ai, noWarnings);
    const msgs = getLeadDetail(id)!.messages;
    markMessageSent(msgs.find((m) => m.kind === "immediate")!.id);
    markMessageSent(msgs.find((m) => m.kind === "follow_up_1d")!.id);
    const f1 = getLeadDetail(id)!.followUps.find((f) => f.kind === "follow_up_1d")!;
    expect(f1.status).toBe("done");
  });

  it("regenerating replaces drafts but keeps sent messages", () => {
    const id = createLead(input);
    saveAIResult(id, ai, noWarnings);
    markMessageSent(getLeadDetail(id)!.messages.find((m) => m.kind === "immediate")!.id);
    saveAIResult(id, { ...ai, immediate_response: "Hi Test, a new draft here." }, noWarnings);
    const msgs = getLeadDetail(id)!.messages;
    expect(msgs.filter((m) => m.status === "sent")).toHaveLength(1);
    expect(msgs.filter((m) => m.status === "draft")).toHaveLength(3);
  });

  it("due follow-ups show on the dashboard and closing a lead cancels them", () => {
    const id = createLead(input);
    scheduleFollowUp(id, addDays(today(), -1), "Call back");
    expect(getDashboardStats().followUpDue).toBe(1);
    expect(listPendingFollowUps(today())).toHaveLength(1);

    setStatus(id, "Lost");
    expect(getDashboardStats().followUpDue).toBe(0);
    expect(() => scheduleFollowUp(id, today(), null)).toThrow(ConflictError);
  });

  it("reschedules and completes a follow-up", () => {
    const id = createLead(input);
    scheduleFollowUp(id, today(), null);
    const fu = getLeadDetail(id)!.followUps[0];
    updateFollowUp(fu.id, { action: "reschedule", due_date: addDays(today(), 5) });
    expect(getLeadDetail(id)!.lead.next_follow_up).toBe(addDays(today(), 5));
    updateFollowUp(fu.id, { action: "complete" });
    expect(getLeadDetail(id)!.lead.next_follow_up).toBeNull();
  });
});

describe("demo seed", () => {
  it("loads at least 8 fictional leads across statuses", async () => {
    resetDbForTests();
    process.env.SEED_DEMO_DATA = "true";
    const { listLeads } = await import("@/lib/leads");
    const leads = listLeads();
    process.env.SEED_DEMO_DATA = "false";
    expect(leads.length).toBeGreaterThanOrEqual(8);
    expect(new Set(leads.map((l) => l.status)).size).toBe(7);
  });
});
