import "server-only";
import { getDb } from "./db";
import { addDays, nowIso, today } from "./dates";
import {
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
  FOLLOW_UP_KIND_LABELS,
  MESSAGE_KIND_LABELS,
  type FollowUpKind,
  type LeadStatus,
  type MessageKind,
} from "./constants";
import type { LeadInput } from "./validation";
import type { AIFollowUpResult } from "./ai/schema";

export interface Lead {
  id: number;
  user_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  property_interest: string;
  budget: string | null;
  location: string | null;
  property_type: string | null;
  requirements: string | null;
  source: string | null;
  notes: string | null;
  status: LeadStatus;
  ai_summary: string | null;
  ai_next_action: string | null;
  ai_missing_info: string | null;
  ai_generated_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadRow extends Lead {
  next_follow_up: string | null;
}

export interface Message {
  id: number;
  lead_id: number;
  kind: MessageKind;
  body: string;
  status: "draft" | "sent";
  warnings: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface FollowUp {
  id: number;
  lead_id: number;
  kind: FollowUpKind;
  due_date: string;
  note: string | null;
  status: "pending" | "done" | "cancelled";
  completed_at: string | null;
  created_at: string;
}

export interface DueFollowUp extends FollowUp {
  lead_name: string;
  lead_status: LeadStatus;
  property_interest: string;
  phone: string | null;
  email: string | null;
}

export interface Activity {
  id: number;
  lead_id: number;
  type: string;
  description: string;
  created_at: string;
}

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

const DEFAULT_USER_ID = 1; // Single-agent MVP. Replaced by the logged-in user in Phase 2.
const closedList = CLOSED_STATUSES.map((s) => `'${s}'`).join(", ");

const NEXT_FOLLOW_UP_SQL = `(SELECT MIN(f.due_date) FROM follow_ups f
  WHERE f.lead_id = l.id AND f.status = 'pending')`;

function logActivity(leadId: number, type: string, description: string): void {
  getDb()
    .prepare("INSERT INTO activities (lead_id, type, description, created_at) VALUES (?, ?, ?, ?)")
    .run(leadId, type, description, nowIso());
}

function touch(leadId: number): void {
  getDb().prepare("UPDATE leads SET updated_at = ? WHERE id = ?").run(nowIso(), leadId);
}

// ---------- Queries ----------

export function listLeads(): LeadRow[] {
  return getDb()
    .prepare(
      `SELECT l.*, ${NEXT_FOLLOW_UP_SQL} AS next_follow_up
       FROM leads l WHERE l.user_id = ? ORDER BY l.created_at DESC`,
    )
    .all(DEFAULT_USER_ID) as LeadRow[];
}

export function getLead(id: number): LeadRow | undefined {
  return getDb()
    .prepare(`SELECT l.*, ${NEXT_FOLLOW_UP_SQL} AS next_follow_up FROM leads l WHERE l.id = ? AND l.user_id = ?`)
    .get(id, DEFAULT_USER_ID) as LeadRow | undefined;
}

function requireLead(id: number): LeadRow {
  const lead = getLead(id);
  if (!lead) throw new NotFoundError("Lead not found");
  return lead;
}

export function getDashboardStats(todayStr: string = today()) {
  const db = getDb();
  const count = (sql: string, ...params: unknown[]) =>
    (db.prepare(sql).get(...params) as { n: number }).n;
  const activeList = ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ");
  return {
    total: count("SELECT COUNT(*) n FROM leads WHERE user_id = ?", DEFAULT_USER_ID),
    new: count("SELECT COUNT(*) n FROM leads WHERE user_id = ? AND status = 'New'", DEFAULT_USER_ID),
    followUpDue: count(
      `SELECT COUNT(DISTINCT l.id) n FROM leads l JOIN follow_ups f ON f.lead_id = l.id
       WHERE l.user_id = ? AND f.status = 'pending' AND f.due_date <= ? AND l.status NOT IN (${closedList})`,
      DEFAULT_USER_ID,
      todayStr,
    ),
    contacted: count(
      `SELECT COUNT(*) n FROM leads WHERE user_id = ? AND status IN (${activeList})`,
      DEFAULT_USER_ID,
    ),
    converted: count("SELECT COUNT(*) n FROM leads WHERE user_id = ? AND status = 'Won'", DEFAULT_USER_ID),
  };
}

/** Pending follow-ups for open leads, soonest first. Pass a date to only get those due by then. */
export function listPendingFollowUps(dueBy?: string): DueFollowUp[] {
  const params: unknown[] = [DEFAULT_USER_ID];
  let where = `l.user_id = ? AND f.status = 'pending' AND l.status NOT IN (${closedList})`;
  if (dueBy) {
    where += " AND f.due_date <= ?";
    params.push(dueBy);
  }
  return getDb()
    .prepare(
      `SELECT f.*, l.name AS lead_name, l.status AS lead_status, l.property_interest, l.phone, l.email
       FROM follow_ups f JOIN leads l ON l.id = f.lead_id
       WHERE ${where} ORDER BY f.due_date ASC, f.id ASC`,
    )
    .all(...params) as DueFollowUp[];
}

export function getLeadDetail(id: number) {
  const lead = getLead(id);
  if (!lead) return undefined;
  const db = getDb();
  const messages = db
    .prepare("SELECT * FROM messages WHERE lead_id = ? ORDER BY CASE kind WHEN 'immediate' THEN 0 WHEN 'follow_up_1d' THEN 1 ELSE 2 END, id DESC")
    .all(id) as Message[];
  const followUps = db
    .prepare("SELECT * FROM follow_ups WHERE lead_id = ? ORDER BY status = 'pending' DESC, due_date ASC")
    .all(id) as FollowUp[];
  const activities = db
    .prepare("SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC, id DESC LIMIT 100")
    .all(id) as Activity[];
  return { lead, messages, followUps, activities };
}

export function getAgent(): { name: string; agency: string | null } {
  const row = getDb().prepare("SELECT name, agency FROM users WHERE id = ?").get(DEFAULT_USER_ID) as
    | { name: string; agency: string | null }
    | undefined;
  return row ?? { name: "Your Name", agency: null };
}

// ---------- Mutations ----------

export function createLead(input: LeadInput): number {
  const db = getDb();
  const now = nowIso();
  return db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO leads (user_id, name, phone, email, property_interest, budget, location,
          property_type, requirements, source, notes, status, created_at, updated_at)
         VALUES (@user_id, @name, @phone, @email, @property_interest, @budget, @location,
          @property_type, @requirements, @source, @notes, 'New', @now, @now)`,
      )
      .run({ ...input, user_id: DEFAULT_USER_ID, now });
    const id = Number(lastInsertRowid);
    logActivity(id, "created", `Lead added (source: ${input.source ?? "not specified"})`);
    return id;
  })();
}

export function updateLead(id: number, input: LeadInput): void {
  requireLead(id);
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `UPDATE leads SET name = @name, phone = @phone, email = @email,
        property_interest = @property_interest, budget = @budget, location = @location,
        property_type = @property_type, requirements = @requirements, source = @source,
        notes = @notes, updated_at = @now WHERE id = @id`,
    ).run({ ...input, id, now: nowIso() });
    logActivity(id, "edit", "Lead details updated");
  })();
}

export function deleteLead(id: number): void {
  requireLead(id);
  getDb().prepare("DELETE FROM leads WHERE id = ?").run(id);
}

export function setStatus(id: number, status: LeadStatus): void {
  const lead = requireLead(id);
  if (lead.status === status) return;
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
    logActivity(id, "status", `Status changed from ${lead.status} to ${status}`);
    if (CLOSED_STATUSES.includes(status)) {
      const { changes } = db
        .prepare("UPDATE follow_ups SET status = 'cancelled', completed_at = ? WHERE lead_id = ? AND status = 'pending'")
        .run(nowIso(), id);
      if (changes > 0) logActivity(id, "follow_up", `${changes} pending follow-up(s) cancelled (lead ${status.toLowerCase()})`);
    }
  })();
}

export function addNote(id: number, note: string): void {
  requireLead(id);
  logActivity(id, "note", note);
  touch(id);
}

/** Stores a fresh set of AI drafts. Messages already marked as sent are kept as history. */
export function saveAIResult(id: number, result: AIFollowUpResult, warnings: Record<MessageKind, string[]>): void {
  requireLead(id);
  const db = getDb();
  const now = nowIso();
  db.transaction(() => {
    db.prepare("DELETE FROM messages WHERE lead_id = ? AND status = 'draft'").run(id);
    const insert = db.prepare(
      "INSERT INTO messages (lead_id, kind, body, status, warnings, created_at) VALUES (?, ?, ?, 'draft', ?, ?)",
    );
    insert.run(id, "immediate", result.immediate_response, JSON.stringify(warnings.immediate), now);
    insert.run(id, "follow_up_1d", result.follow_up_1_day, JSON.stringify(warnings.follow_up_1d), now);
    insert.run(id, "follow_up_3d", result.follow_up_3_days, JSON.stringify(warnings.follow_up_3d), now);
    db.prepare(
      `UPDATE leads SET ai_summary = ?, ai_next_action = ?, ai_missing_info = ?, ai_generated_at = ?,
        updated_at = ? WHERE id = ?`,
    ).run(result.lead_summary, result.suggested_next_action, JSON.stringify(result.missing_information), now, now, id);
    logActivity(id, "ai", "AI follow-up messages generated");
  })();
}

/**
 * Marks a message as sent and moves the follow-up schedule forward:
 * - Immediate response sent -> lead becomes "Contacted" (if New) and the
 *   1-day and 3-day follow-ups are scheduled from today.
 * - A follow-up message sent -> its matching pending follow-up is completed.
 */
export function markMessageSent(messageId: number): { leadId: number } {
  const db = getDb();
  const msg = db.prepare("SELECT * FROM messages WHERE id = ?").get(messageId) as Message | undefined;
  if (!msg) throw new NotFoundError("Message not found");
  const lead = requireLead(msg.lead_id);
  if (msg.status === "sent") throw new ConflictError("This message is already marked as sent");

  const now = nowIso();
  const t = today();
  db.transaction(() => {
    db.prepare("UPDATE messages SET status = 'sent', sent_at = ? WHERE id = ?").run(now, messageId);
    db.prepare("UPDATE leads SET last_contacted_at = ?, updated_at = ? WHERE id = ?").run(now, now, lead.id);
    logActivity(lead.id, "message", `${MESSAGE_KIND_LABELS[msg.kind]} marked as sent`);

    if (msg.kind === "immediate") {
      if (lead.status === "New") {
        db.prepare("UPDATE leads SET status = 'Contacted' WHERE id = ?").run(lead.id);
        logActivity(lead.id, "status", "Status changed from New to Contacted");
      }
      if (!CLOSED_STATUSES.includes(lead.status)) {
        db.prepare(
          "UPDATE follow_ups SET status = 'cancelled', completed_at = ? WHERE lead_id = ? AND status = 'pending' AND kind IN ('follow_up_1d', 'follow_up_3d')",
        ).run(now, lead.id);
        const ins = db.prepare(
          "INSERT INTO follow_ups (lead_id, kind, due_date, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
        );
        ins.run(lead.id, "follow_up_1d", addDays(t, 1), now);
        ins.run(lead.id, "follow_up_3d", addDays(t, 3), now);
        logActivity(lead.id, "follow_up", "1-day and 3-day follow-ups scheduled");
      }
    } else {
      const { changes } = db
        .prepare("UPDATE follow_ups SET status = 'done', completed_at = ? WHERE lead_id = ? AND kind = ? AND status = 'pending'")
        .run(now, lead.id, msg.kind);
      if (changes > 0) logActivity(lead.id, "follow_up", `${FOLLOW_UP_KIND_LABELS[msg.kind]} completed`);
    }
  })();
  return { leadId: lead.id };
}

export function scheduleFollowUp(leadId: number, dueDate: string, note: string | null): void {
  const lead = requireLead(leadId);
  if (CLOSED_STATUSES.includes(lead.status)) {
    throw new ConflictError(`This lead is marked ${lead.status}. Change the status before scheduling a follow-up.`);
  }
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      "INSERT INTO follow_ups (lead_id, kind, due_date, note, status, created_at) VALUES (?, 'manual', ?, ?, 'pending', ?)",
    ).run(leadId, dueDate, note, nowIso());
    logActivity(leadId, "follow_up", `Follow-up scheduled for ${dueDate}${note ? `: ${note}` : ""}`);
    touch(leadId);
  })();
}

export function updateFollowUp(
  followUpId: number,
  action: { action: "complete" } | { action: "cancel" } | { action: "reschedule"; due_date: string },
): { leadId: number } {
  const db = getDb();
  const fu = db.prepare("SELECT * FROM follow_ups WHERE id = ?").get(followUpId) as FollowUp | undefined;
  if (!fu) throw new NotFoundError("Follow-up not found");
  requireLead(fu.lead_id);
  if (fu.status !== "pending") throw new ConflictError("This follow-up is already closed");

  const label = FOLLOW_UP_KIND_LABELS[fu.kind];
  const now = nowIso();
  db.transaction(() => {
    if (action.action === "complete") {
      db.prepare("UPDATE follow_ups SET status = 'done', completed_at = ? WHERE id = ?").run(now, followUpId);
      db.prepare("UPDATE leads SET last_contacted_at = ? WHERE id = ?").run(now, fu.lead_id);
      logActivity(fu.lead_id, "follow_up", `${label} marked as done`);
    } else if (action.action === "cancel") {
      db.prepare("UPDATE follow_ups SET status = 'cancelled', completed_at = ? WHERE id = ?").run(now, followUpId);
      logActivity(fu.lead_id, "follow_up", `${label} cancelled`);
    } else {
      db.prepare("UPDATE follow_ups SET due_date = ? WHERE id = ?").run(action.due_date, followUpId);
      logActivity(fu.lead_id, "follow_up", `${label} moved to ${action.due_date}`);
    }
    touch(fu.lead_id);
  })();
  return { leadId: fu.lead_id };
}
