import type Database from "better-sqlite3";
import { addDays, today } from "./dates";
import type { LeadStatus, FollowUpKind, MessageKind } from "./constants";

// All people, phone numbers (555 range), emails (example.com) and properties
// below are fictional. They exist only so the dashboard looks useful on day one.

interface SeedLead {
  name: string;
  phone?: string;
  email?: string;
  property_interest: string;
  budget?: string;
  location?: string;
  property_type?: string;
  requirements?: string;
  source?: string;
  notes?: string;
  status: LeadStatus;
  createdDaysAgo: number;
  lastContactedDaysAgo?: number;
  followUps?: { kind: FollowUpKind; inDays: number; status?: "pending" | "done"; note?: string }[];
  messages?: { kind: MessageKind; body: string; sentDaysAgo?: number }[];
  ai?: { summary: string; nextAction: string; missing: string[] };
  activity?: { daysAgo: number; type: string; description: string }[];
}

const LEADS: SeedLead[] = [
  {
    name: "Sarah Mitchell",
    phone: "+1 555 010 2231",
    email: "sarah.mitchell@example.com",
    property_interest: "2-bedroom apartment in Riverside District",
    budget: "$350,000 – $400,000",
    location: "Riverside District",
    property_type: "Apartment",
    requirements: "2 bedrooms, balcony, parking space, close to public transport",
    source: "Website",
    notes: "Enquired through the website contact form. First-time buyer.",
    status: "New",
    createdDaysAgo: 0,
  },
  {
    name: "David Okafor",
    phone: "+1 555 010 4410",
    property_interest: "Family house with a garden",
    location: "Oakwood",
    property_type: "House",
    source: "Referral",
    notes: "Referred by a past client. Has two young children.",
    status: "New",
    createdDaysAgo: 0,
  },
  {
    name: "Priya Raman",
    email: "priya.raman@example.com",
    phone: "+1 555 010 7788",
    property_interest: "1-bedroom rental apartment Downtown",
    budget: "$2,200 per month",
    location: "Downtown",
    property_type: "Apartment",
    requirements: "Furnished, pet-friendly (one cat), move-in within 6 weeks",
    source: "Property portal",
    notes: "Relocating for a new job. Prefers WhatsApp.",
    status: "Contacted",
    createdDaysAgo: 2,
    lastContactedDaysAgo: 1,
    messages: [
      {
        kind: "immediate",
        sentDaysAgo: 1,
        body: "Hi Priya, thanks for reaching out about 1-bedroom rentals Downtown. I noted you're looking for a furnished, pet-friendly place around $2,200 per month, with move-in within 6 weeks. I'll check what matches and get back to you. Is WhatsApp the best way to reach you?",
      },
      {
        kind: "follow_up_1d",
        body: "Hi Priya, just following up on your search for a furnished, pet-friendly 1-bedroom Downtown. Do you have a preferred move-in date yet? That will help me narrow down the options.",
      },
      {
        kind: "follow_up_3d",
        body: "Hi Priya, checking in on your Downtown rental search. If your requirements have changed at all, let me know and I'll adjust what I look for. Happy to help whenever you're ready.",
      },
    ],
    ai: {
      summary:
        "Priya is relocating for a new job and wants a furnished, pet-friendly 1-bedroom rental Downtown at about $2,200 per month, moving in within 6 weeks. She prefers WhatsApp.",
      nextAction:
        "Confirm her exact move-in date and whether the $2,200 budget includes utilities, then share suitable listings you have verified.",
      missing: ["Exact move-in date", "Whether budget includes utilities"],
    },
    followUps: [
      { kind: "follow_up_1d", inDays: 0 },
      { kind: "follow_up_3d", inDays: 2 },
    ],
  },
  {
    name: "James Carter",
    phone: "+1 555 010 3302",
    email: "j.carter@example.com",
    property_interest: "3-bedroom townhouse in Maple Heights",
    budget: "$450,000 – $500,000",
    location: "Maple Heights",
    property_type: "Townhouse",
    requirements: "3 bedrooms, home office, good school district",
    source: "Open house",
    notes: "Met at the open house last weekend. Pre-approved for a mortgage.",
    status: "Interested",
    createdDaysAgo: 8,
    lastContactedDaysAgo: 4,
    followUps: [{ kind: "manual", inDays: -1, note: "Send the two townhouse listings he asked about" }],
    activity: [{ daysAgo: 4, type: "status", description: "Status changed from Contacted to Interested" }],
  },
  {
    name: "Elena Petrova",
    phone: "+1 555 010 9120",
    email: "elena.p@example.com",
    property_interest: "Sea-view villa in Harbor Point",
    budget: "$1,200,000",
    location: "Harbor Point",
    property_type: "Villa",
    requirements: "4+ bedrooms, pool, sea view",
    source: "Referral",
    notes: "Viewing confirmed for Saturday at 11am. Bringing her husband.",
    status: "Viewing Scheduled",
    createdDaysAgo: 10,
    lastContactedDaysAgo: 2,
    followUps: [{ kind: "manual", inDays: 3, note: "Ask for feedback after the viewing" }],
  },
  {
    name: "Marcus Lee",
    phone: "+1 555 010 6645",
    property_interest: "2-bedroom condo in Midtown",
    budget: "$520,000",
    location: "Midtown",
    property_type: "Condo",
    requirements: "Gym in building, underground parking",
    source: "Property portal",
    notes: "Made an offer of $505,000. Seller is considering it.",
    status: "Negotiating",
    createdDaysAgo: 21,
    lastContactedDaysAgo: 3,
    followUps: [{ kind: "manual", inDays: 0, note: "Update Marcus on the seller's response" }],
  },
  {
    name: "Aisha Bello",
    email: "aisha.bello@example.com",
    property_interest: "3-bedroom apartment in Lakeside",
    budget: "$410,000",
    location: "Lakeside",
    property_type: "Apartment",
    source: "Website",
    notes: "Offer accepted. Closing handled by her lawyer.",
    status: "Won",
    createdDaysAgo: 45,
    lastContactedDaysAgo: 6,
  },
  {
    name: "Tom Becker",
    phone: "+1 555 010 2290",
    property_interest: "Starter home under $300k",
    budget: "Under $300,000",
    location: "Greenfield",
    property_type: "House",
    source: "Social media",
    notes: "Bought a property through another agent.",
    status: "Lost",
    createdDaysAgo: 30,
    lastContactedDaysAgo: 12,
  },
  {
    name: "Hannah Schultz",
    phone: "+1 555 010 5567",
    property_interest: "Studio rental near the university",
    budget: "$1,400 per month",
    location: "University Quarter",
    property_type: "Studio",
    requirements: "Furnished, short walk to campus",
    source: "Social media",
    notes: "Graduate student starting next semester.",
    status: "Contacted",
    createdDaysAgo: 6,
    lastContactedDaysAgo: 5,
    followUps: [{ kind: "manual", inDays: -2, note: "Check if she is still looking" }],
  },
  {
    name: "Carlos Mendes",
    phone: "+1 555 010 8834",
    email: "carlos.mendes@example.com",
    property_interest: "Building plot for a custom home",
    location: "Cedar Valley",
    property_type: "Land",
    requirements: "At least 0.5 acre, utilities connected",
    source: "Phone call",
    status: "Interested",
    createdDaysAgo: 12,
    lastContactedDaysAgo: 7,
    followUps: [{ kind: "manual", inDays: 5, note: "Ask about his budget range" }],
  },
];

export function seedDemoData(db: Database.Database): void {
  const t = today();
  const isoDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const insertLead = db.prepare(`
    INSERT INTO leads (user_id, name, phone, email, property_interest, budget, location,
      property_type, requirements, source, notes, status, ai_summary, ai_next_action,
      ai_missing_info, ai_generated_at, last_contacted_at, created_at, updated_at)
    VALUES (1, @name, @phone, @email, @property_interest, @budget, @location,
      @property_type, @requirements, @source, @notes, @status, @ai_summary, @ai_next_action,
      @ai_missing_info, @ai_generated_at, @last_contacted_at, @created_at, @created_at)
  `);
  const insertActivity = db.prepare(
    "INSERT INTO activities (lead_id, type, description, created_at) VALUES (?, ?, ?, ?)",
  );
  const insertFollowUp = db.prepare(
    "INSERT INTO follow_ups (lead_id, kind, due_date, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertMessage = db.prepare(
    "INSERT INTO messages (lead_id, kind, body, status, warnings, sent_at, created_at) VALUES (?, ?, ?, ?, '[]', ?, ?)",
  );

  db.transaction(() => {
    for (const l of LEADS) {
      const createdAt = isoDaysAgo(l.createdDaysAgo);
      const { lastInsertRowid } = insertLead.run({
        name: l.name,
        phone: l.phone ?? null,
        email: l.email ?? null,
        property_interest: l.property_interest,
        budget: l.budget ?? null,
        location: l.location ?? null,
        property_type: l.property_type ?? null,
        requirements: l.requirements ?? null,
        source: l.source ?? null,
        notes: l.notes ?? null,
        status: l.status,
        ai_summary: l.ai?.summary ?? null,
        ai_next_action: l.ai?.nextAction ?? null,
        ai_missing_info: l.ai ? JSON.stringify(l.ai.missing) : null,
        ai_generated_at: l.ai ? isoDaysAgo(1) : null,
        last_contacted_at:
          l.lastContactedDaysAgo !== undefined ? isoDaysAgo(l.lastContactedDaysAgo) : null,
        created_at: createdAt,
      });
      const leadId = Number(lastInsertRowid);

      insertActivity.run(leadId, "created", `Lead added (source: ${l.source ?? "not specified"})`, createdAt);
      for (const m of l.messages ?? []) {
        const sent = m.sentDaysAgo !== undefined;
        insertMessage.run(leadId, m.kind, m.body, sent ? "sent" : "draft", sent ? isoDaysAgo(m.sentDaysAgo!) : null, isoDaysAgo(1));
      }
      if (l.messages) insertActivity.run(leadId, "ai", "AI follow-up messages generated", isoDaysAgo(1));
      for (const f of l.followUps ?? []) {
        insertFollowUp.run(leadId, f.kind, addDays(t, f.inDays), f.note ?? null, f.status ?? "pending", isoDaysAgo(1));
      }
      for (const a of l.activity ?? []) insertActivity.run(leadId, a.type, a.description, isoDaysAgo(a.daysAgo));
      if (l.status !== "New" && !l.activity) {
        insertActivity.run(leadId, "status", `Status changed to ${l.status}`, isoDaysAgo(l.lastContactedDaysAgo ?? 0));
      }
    }
  })();
}
