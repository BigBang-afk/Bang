import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLeadDetail, type Message } from "@/lib/leads";
import { CLOSED_STATUSES, MESSAGE_KINDS } from "@/lib/constants";
import { formatDateTime, today } from "@/lib/dates";
import { isDemoMode } from "@/lib/ai/provider";
import { StatusBadge } from "@/components/StatusBadge";
import { DueLabel } from "@/components/DueLabel";
import { StatusSelect } from "@/components/lead/StatusSelect";
import { GenerateButton } from "@/components/lead/GenerateButton";
import { MessageCard } from "@/components/lead/MessageCard";
import { FollowUpSchedule } from "@/components/lead/FollowUpSchedule";
import { AddNote } from "@/components/lead/AddNote";
import { DeleteLead } from "@/components/lead/DeleteLead";
import { CopyButton } from "@/components/lead/CopyButton";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const ACTIVITY_DOT: Record<string, string> = {
  created: "bg-sky-500",
  status: "bg-violet-500",
  ai: "bg-brand-500",
  message: "bg-emerald-500",
  follow_up: "bg-amber-500",
  note: "bg-slate-500",
  edit: "bg-slate-400",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const detail = getLeadDetail(Number((await params).id));
  return { title: detail ? `${detail.lead.name} · AI Lead Assistant` : "Lead not found" };
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const detail = Number.isInteger(id) && id > 0 ? getLeadDetail(id) : undefined;
  if (!detail) notFound();
  const { lead, messages, followUps, activities } = detail;
  const todayStr = today();
  const closed = CLOSED_STATUSES.includes(lead.status);

  // For each message type show the current draft, or the most recent sent one.
  const current = MESSAGE_KINDS.map(
    (kind) =>
      messages.find((m) => m.kind === kind && m.status === "draft") ??
      messages.find((m) => m.kind === kind && m.status === "sent"),
  ).filter((m): m is Message => Boolean(m));
  const hasDrafts = messages.some((m) => m.status === "draft");
  const immediateSent = messages.some((m) => m.kind === "immediate" && m.status === "sent");
  const missing = parseList(lead.ai_missing_info);

  const info: [string, string | null][] = [
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Property interest", lead.property_interest],
    ["Budget", lead.budget],
    ["Preferred location", lead.location],
    ["Property type", lead.property_type],
    ["Requirements", lead.requirements],
    ["Source", lead.source],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← All leads
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{lead.name}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {lead.property_interest} · Added {formatDateTime(lead.created_at)}
              {lead.next_follow_up && (
                <>
                  {" "}
                  · Next follow-up: <DueLabel date={lead.next_follow_up} todayStr={todayStr} />
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusSelect key={lead.status} leadId={lead.id} status={lead.status} />
            <Link href={`/leads/${lead.id}/edit`} className="btn-secondary">
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* AI assistant */}
          <section id="messages" className="card scroll-mt-20">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="section-title">AI Assistant</h2>
                <p className="text-xs text-slate-500">
                  {lead.ai_generated_at
                    ? `Last generated ${formatDateTime(lead.ai_generated_at)}. Always review before sending.`
                    : "Drafts a first reply, two follow-ups, a summary and the next step, using only the details on this lead."}
                  {isDemoMode() && " (Demo mode: template messages, no AI key set.)"}
                </p>
              </div>
              <GenerateButton leadId={lead.id} hasDrafts={hasDrafts} />
            </div>

            {current.length === 0 && !lead.ai_summary ? (
              <div className="px-4 py-10 text-center">
                <p className="font-medium text-slate-900">No messages yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Click <strong>Generate AI Follow-Up</strong> to draft your messages. The more details this lead has, the better the drafts.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                {lead.ai_summary && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lead summary</h3>
                        <CopyButton text={lead.ai_summary} className="btn-ghost btn-sm" />
                      </div>
                      <p className="mt-1 text-sm text-slate-800">{lead.ai_summary}</p>
                    </div>
                    <div className="rounded-lg bg-brand-50 p-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-700">Suggested next action</h3>
                      <p className="mt-1 text-sm text-slate-800">{lead.ai_next_action}</p>
                    </div>
                  </div>
                )}
                {missing.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-medium text-slate-600">Missing info:</span>
                    {missing.map((m) => (
                      <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                {current.map((m) => (
                  <MessageCard
                    key={m.id}
                    phone={lead.phone}
                    email={lead.email}
                    locked={m.kind !== "immediate" && !immediateSent}
                    message={{
                      id: m.id,
                      kind: m.kind,
                      body: m.body,
                      status: m.status,
                      sent_at: m.sent_at,
                      warnings: parseList(m.warnings),
                      sentLabel: m.sent_at ? `Sent ${formatDateTime(m.sent_at)}` : null,
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Activity */}
          <section className="card">
            <h2 className="section-title border-b border-slate-200 p-4">Activity</h2>
            <div className="space-y-4 p-4">
              <AddNote leadId={lead.id} />
              {activities.length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                  {activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className={`absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full ${ACTIVITY_DOT[a.type] ?? "bg-slate-400"}`} aria-hidden />
                      <p className="whitespace-pre-wrap text-sm text-slate-800">{a.description}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <h2 className="section-title border-b border-slate-200 p-4">Follow-up schedule</h2>
            <div className="p-4">
              <FollowUpSchedule
                leadId={lead.id}
                todayStr={todayStr}
                closed={closed}
                followUps={followUps.map((f) => ({ id: f.id, kind: f.kind, due_date: f.due_date, note: f.note, status: f.status }))}
              />
            </div>
          </section>

          <section className="card">
            <h2 className="section-title border-b border-slate-200 p-4">Lead information</h2>
            <dl className="divide-y divide-slate-100 text-sm">
              {info.map(([label, value]) => (
                <div key={label} className="grid grid-cols-3 gap-2 px-4 py-2.5">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className={`col-span-2 break-words ${value ? "text-slate-900" : "text-slate-400"}`}>{value ?? "Not provided"}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card">
            <h2 className="section-title border-b border-slate-200 p-4">Notes</h2>
            <p className={`whitespace-pre-wrap p-4 text-sm ${lead.notes ? "text-slate-800" : "text-slate-400"}`}>
              {lead.notes ?? "No notes. Add confirmed facts via Edit so the AI can use them."}
            </p>
          </section>

          <div className="flex justify-end">
            <DeleteLead leadId={lead.id} name={lead.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
