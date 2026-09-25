"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { LEAD_SOURCES, PROPERTY_TYPES } from "@/lib/constants";

export interface LeadFormValues {
  name: string;
  phone: string;
  email: string;
  property_interest: string;
  budget: string;
  location: string;
  property_type: string;
  requirements: string;
  source: string;
  notes: string;
}

const EMPTY: LeadFormValues = {
  name: "",
  phone: "",
  email: "",
  property_interest: "",
  budget: "",
  location: "",
  property_type: "",
  requirements: "",
  source: "",
  notes: "",
};

export function LeadForm({ leadId, initial }: { leadId?: number; initial?: Partial<LeadFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<LeadFormValues>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = leadId !== undefined;

  const set = (key: keyof LeadFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Quick client-side checks; the server validates everything again.
    const local: Record<string, string> = {};
    if (!values.name.trim()) local.name = "Name is required";
    if (!values.property_interest.trim()) local.property_interest = "Property interest is required";
    if (!values.phone.trim() && !values.email.trim()) local.phone = "Add a phone number or an email address";
    setErrors(local);
    if (Object.keys(local).length) return;

    setSaving(true);
    setFormError(null);
    const res = isEdit
      ? await api(`/api/leads/${leadId}`, "PUT", values)
      : await api<{ id: number }>("/api/leads", "POST", values);
    if (!res.ok) {
      setSaving(false);
      setErrors(res.fields ?? {});
      setFormError(res.error);
      return;
    }
    const id = isEdit ? leadId : (res.data as { id: number }).id;
    router.push(`/leads/${id}`);
    router.refresh();
  }

  const field = (key: keyof LeadFormValues) => ({
    id: key,
    name: key,
    value: values[key],
    onChange: set(key),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
    className: `input ${errors[key] ? "input-error" : ""}`,
  });

  const err = (key: string) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-1 text-xs text-red-600">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {formError}
        </div>
      )}

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="section-title">Contact</h2>
          <p className="text-xs text-slate-500">Required: name and at least one way to reach them.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="name" className="label">
              Name <span className="text-red-500">*</span>
            </label>
            <input {...field("name")} maxLength={120} autoComplete="off" placeholder="e.g. Sarah Mitchell" />
            {err("name")}
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Phone / WhatsApp
            </label>
            <input {...field("phone")} type="tel" maxLength={40} placeholder="+1 555 010 1234" />
            {err("phone")}
          </div>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input {...field("email")} type="email" maxLength={200} placeholder="name@example.com" />
            {err("email")}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">What they&apos;re looking for</h2>
        <div>
          <label htmlFor="property_interest" className="label">
            Property interest <span className="text-red-500">*</span>
          </label>
          <input
            {...field("property_interest")}
            maxLength={300}
            placeholder="e.g. 2-bedroom apartment in Riverside, or the listing they enquired about"
          />
          {err("property_interest")}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="budget" className="label">
              Budget
            </label>
            <input {...field("budget")} maxLength={100} placeholder="e.g. $350,000 – $400,000" />
            {err("budget")}
          </div>
          <div>
            <label htmlFor="location" className="label">
              Preferred location
            </label>
            <input {...field("location")} maxLength={150} placeholder="e.g. Riverside District" />
            {err("location")}
          </div>
          <div>
            <label htmlFor="property_type" className="label">
              Property type
            </label>
            <select {...field("property_type")}>
              <option value="">Not specified</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
              {values.property_type && !(PROPERTY_TYPES as readonly string[]).includes(values.property_type) && (
                <option>{values.property_type}</option>
              )}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="requirements" className="label">
            Requirements
          </label>
          <textarea {...field("requirements")} rows={2} maxLength={2000} placeholder="Bedrooms, parking, pets, move-in date…" />
          {err("requirements")}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Context</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="source" className="label">
              Lead source
            </label>
            <select {...field("source")}>
              <option value="">Not specified</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
              {values.source && !(LEAD_SOURCES as readonly string[]).includes(values.source) && <option>{values.source}</option>}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="label">
            Notes
          </label>
          <textarea {...field("notes")} rows={4} maxLength={4000} placeholder="Anything you know for sure. The AI will only use facts written here." />
          <p className="mt-1 text-xs text-slate-500">
            Tip: add confirmed facts (price, availability, viewing time) here if you want the AI to mention them.
          </p>
          {err("notes")}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={isEdit ? `/leads/${leadId}` : "/"} className="btn-secondary">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save lead"}
        </button>
      </div>
    </form>
  );
}
