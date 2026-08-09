"use client";

import { useState, useTransition } from "react";
import { changePasswordAction, setPinAction } from "@/lib/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) return setError("New passwords do not match.");
    startTransition(async () => {
      const result = await changePasswordAction({ currentPassword, newPassword });
      if (result?.error) setError(result.error);
      else {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Current Password">
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </FormField>
        <FormField label="New Password" hint="At least 8 characters">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </FormField>
        <FormField label="Confirm New Password">
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </FormField>
        {error && <p className="text-xs text-negative">{error}</p>}
        {success && <p className="text-xs text-positive">Password updated.</p>}
        <div className="flex justify-end">
          <Button disabled={pending || !currentPassword || !newPassword} onClick={submit}>
            {pending ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SetPinForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await setPinAction({ pin });
      if (result?.error) setError(result.error);
      else {
        setSuccess(true);
        setPin("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick-Access PIN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="4-6 Digit PIN" hint="Optional additional PIN for quick access">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </FormField>
        {error && <p className="text-xs text-negative">{error}</p>}
        {success && <p className="text-xs text-positive">PIN saved.</p>}
        <div className="flex justify-end">
          <Button disabled={pending || pin.length < 4} onClick={submit}>
            {pending ? "Saving…" : "Save PIN"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
