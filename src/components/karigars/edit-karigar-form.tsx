"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { KARIGAR_SPECIALIZATIONS, KARIGAR_SPECIALIZATION_LABELS, type KarigarSpecializationValue } from "@/types/karigars";
import { updateKarigarAction } from "@/lib/actions/karigars.actions";
import type { KarigarRow } from "@/services/karigar.service";

export function EditKarigarForm({ karigar }: { karigar: KarigarRow }) {
  const router = useRouter();
  const [fields, setFields] = useState({
    name: karigar.name,
    phone: karigar.phone,
    secondaryPhone: karigar.secondaryPhone ?? "",
    address: karigar.address ?? "",
    city: karigar.city ?? "",
    specialization: karigar.specialization as KarigarSpecializationValue,
    notes: karigar.notes ?? "",
  });
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await updateKarigarAction({
        id: karigar.id,
        name: fields.name,
        phone: fields.phone,
        secondaryPhone: fields.secondaryPhone || undefined,
        address: fields.address || undefined,
        city: fields.city || undefined,
        specialization: fields.specialization,
        notes: fields.notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Karigar updated.");
      router.push(`/karigars/${karigar.id}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Name" required>
              <Input id="name" value={fields.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field id="phone" label="Phone" required>
              <Input id="phone" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field id="secondaryPhone" label="Secondary Phone">
              <Input
                id="secondaryPhone"
                value={fields.secondaryPhone}
                onChange={(e) => set("secondaryPhone", e.target.value)}
              />
            </Field>
            <Field id="city" label="City">
              <Input id="city" value={fields.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field id="address" label="Address" className="sm:col-span-2">
              <Input id="address" value={fields.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field id="notes" label="Notes" className="sm:col-span-2">
              <Input id="notes" value={fields.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Specialization</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={fields.specialization} onValueChange={(v) => set("specialization", v as KarigarSpecializationValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KARIGAR_SPECIALIZATIONS.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {KARIGAR_SPECIALIZATION_LABELS[spec]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button size="lg" className="h-12" disabled={pending || !fields.name.trim() || !fields.phone.trim()} onClick={handleSubmit}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </Label>
      {children}
    </div>
  );
}
