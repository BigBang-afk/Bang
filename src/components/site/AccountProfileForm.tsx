"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AccountProfileForm({
  initial,
}: {
  initial: { fullName: string; email: string; mobile: string; dob: string };
}) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Profile updated." : (data.error ?? "Update failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 rounded-sm border border-gold/20 bg-ivory p-6">
      <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Mobile Number" value={initial.mobile} disabled hint="Mobile number cannot be changed." />
      <Input label="Date of Birth" value={initial.dob} disabled />
      {message && <p className="text-sm text-brown-light">{message}</p>}
      <Button type="submit" loading={loading} size="sm" className="self-start">
        Save Changes
      </Button>
    </form>
  );
}
