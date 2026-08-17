"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSupplierAction } from "@/lib/actions/suppliers.actions";
import type { SupplierRow } from "@/services/supplier.service";

export function EditSupplierForm({ supplier }: { supplier: SupplierRow }) {
  const router = useRouter();
  const [fields, setFields] = useState({
    name: supplier.name,
    companyName: supplier.companyName ?? "",
    phone: supplier.phone,
    secondaryPhone: supplier.secondaryPhone ?? "",
    email: supplier.email ?? "",
    address: supplier.address ?? "",
    city: supplier.city ?? "",
    notes: supplier.notes ?? "",
  });
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await updateSupplierAction({
        id: supplier.id,
        name: fields.name,
        companyName: fields.companyName || undefined,
        phone: fields.phone,
        secondaryPhone: fields.secondaryPhone || undefined,
        email: fields.email || undefined,
        address: fields.address || undefined,
        city: fields.city || undefined,
        notes: fields.notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Supplier updated.");
      router.push(`/suppliers/${supplier.id}`);
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
            <Field id="name" label="Supplier Name" required>
              <Input id="name" value={fields.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field id="companyName" label="Company Name">
              <Input id="companyName" value={fields.companyName} onChange={(e) => set("companyName", e.target.value)} />
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
            <Field id="email" label="Email">
              <Input id="email" type="email" value={fields.email} onChange={(e) => set("email", e.target.value)} />
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
