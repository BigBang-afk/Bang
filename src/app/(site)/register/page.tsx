"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fieldErrors ?? { form: data.error ?? "Registration failed." });
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Join Us</p>
        <h1 className="mt-2 font-display text-3xl text-maroon">Create Your Account</h1>
        <div className="gold-divider mx-auto my-6 w-24" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-sm border border-gold/20 bg-ivory p-8">
        <Input label="Full Name" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} error={errors.fullName} />
        <Input label="Mobile Number" required placeholder="+92300xxxxxxx" value={form.mobile} onChange={(e) => update("mobile", e.target.value)} error={errors.mobile} />
        <Input label="Date of Birth" type="date" required value={form.dob} onChange={(e) => update("dob", e.target.value)} error={errors.dob} />
        <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} error={errors.email} />
        <Input label="Password" type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} error={errors.password} hint="At least 8 characters." />
        <Input label="Confirm Password" type="password" required value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} error={errors.confirmPassword} />
        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
        <Button type="submit" loading={loading}>
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-brown-light">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-maroon hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
