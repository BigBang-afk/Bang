import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLead } from "@/lib/leads";
import { LeadForm } from "@/components/LeadForm";

export const metadata = { title: "Edit lead · AI Lead Assistant" };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const lead = Number.isInteger(id) && id > 0 ? getLead(id) : undefined;
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/leads/${lead.id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to {lead.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Edit lead</h1>
      </div>
      <LeadForm
        leadId={lead.id}
        initial={{
          name: lead.name,
          phone: lead.phone ?? "",
          email: lead.email ?? "",
          property_interest: lead.property_interest,
          budget: lead.budget ?? "",
          location: lead.location ?? "",
          property_type: lead.property_type ?? "",
          requirements: lead.requirements ?? "",
          source: lead.source ?? "",
          notes: lead.notes ?? "",
        }}
      />
    </div>
  );
}
