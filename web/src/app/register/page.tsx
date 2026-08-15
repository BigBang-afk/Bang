import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account — Nexara",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join thousands of traders using AI-powered market insight."
    >
      <RegisterForm />
    </AuthShell>
  );
}
