import { LeadForm } from "@/components/LeadForm";

export const metadata = { title: "Add lead · AI Lead Assistant" };

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Add a lead</h1>
        <p className="text-sm text-slate-500">After saving, generate a first reply and follow-ups in one click.</p>
      </div>
      <LeadForm />
    </div>
  );
}
