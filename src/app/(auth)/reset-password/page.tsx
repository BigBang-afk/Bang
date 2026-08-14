import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // Reaching this page with a session means the user followed a valid
  // recovery-email link (handled by /auth/callback). No session means the
  // link is missing, expired, or they navigated here directly.
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/forgot-password");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
