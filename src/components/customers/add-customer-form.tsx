"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/types/customers";
import {
  createCustomerAction,
  findPossibleDuplicatesAction,
} from "@/lib/actions/customers.actions";
import type { PossibleDuplicateCustomer } from "@/services/customer.service";

const initialState = {
  firstName: "",
  lastName: "",
  phone: "",
  secondaryPhone: "",
  email: "",
  address: "",
  city: "",
  dateOfBirth: "",
  anniversaryDate: "",
  preferredLanguage: "",
  customerType: "REGULAR" as (typeof CUSTOMER_TYPES)[number],
  notes: "",
};

export function AddCustomerForm() {
  const router = useRouter();
  const [fields, setFields] = useState(initialState);
  const [duplicates, setDuplicates] = useState<PossibleDuplicateCustomer[] | null>(null);
  const [checking, startCheckTransition] = useTransition();
  const [saving, startSaveTransition] = useTransition();

  function set<K extends keyof typeof initialState>(key: K, value: (typeof initialState)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleCheckAndSubmit() {
    startCheckTransition(async () => {
      const result = await findPossibleDuplicatesAction({
        phone: fields.phone,
        secondaryPhone: fields.secondaryPhone || undefined,
        email: fields.email || undefined,
      });
      if (result.ok && result.data.length > 0) {
        setDuplicates(result.data);
        return;
      }
      submitCreate();
    });
  }

  function submitCreate() {
    startSaveTransition(async () => {
      const result = await createCustomerAction({
        firstName: fields.firstName,
        lastName: fields.lastName || undefined,
        phone: fields.phone,
        secondaryPhone: fields.secondaryPhone || undefined,
        email: fields.email || undefined,
        address: fields.address || undefined,
        city: fields.city || undefined,
        dateOfBirth: fields.dateOfBirth || undefined,
        anniversaryDate: fields.anniversaryDate || undefined,
        preferredLanguage: fields.preferredLanguage || undefined,
        customerType: fields.customerType,
        notes: fields.notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer created.");
      router.push(`/customers/${result.data.id}`);
    });
  }

  const pending = checking || saving;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="firstName" label="First Name" required>
                <Input id="firstName" value={fields.firstName} onChange={(e) => set("firstName", e.target.value)} />
              </Field>
              <Field id="lastName" label="Last Name">
                <Input id="lastName" value={fields.lastName} onChange={(e) => set("lastName", e.target.value)} />
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
              <Field id="preferredLanguage" label="Preferred Language">
                <Input
                  id="preferredLanguage"
                  value={fields.preferredLanguage}
                  onChange={(e) => set("preferredLanguage", e.target.value)}
                />
              </Field>
              <Field id="address" label="Address" className="sm:col-span-2">
                <Input id="address" value={fields.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field id="city" label="City">
                <Input id="city" value={fields.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="dateOfBirth" label="Date of Birth">
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={fields.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </Field>
              <Field id="anniversaryDate" label="Anniversary">
                <Input
                  id="anniversaryDate"
                  type="date"
                  value={fields.anniversaryDate}
                  onChange={(e) => set("anniversaryDate", e.target.value)}
                />
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
              <CardTitle>Customer Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={fields.customerType} onValueChange={(v) => set("customerType", v as typeof fields.customerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CUSTOMER_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="h-12"
            disabled={pending || !fields.firstName.trim() || !fields.phone.trim()}
            onClick={handleCheckAndSubmit}
          >
            {checking ? "Checking..." : saving ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </div>

      <Dialog open={duplicates !== null} onOpenChange={(open) => !open && setDuplicates(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning" />
              Possible duplicate customer
            </DialogTitle>
            <DialogDescription>
              One or more existing customers share this phone, secondary phone, or email.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {duplicates?.map((dup) => (
              <div key={dup.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium text-foreground">{dup.name}</p>
                <p className="text-muted-foreground">{dup.phone}</p>
                <p className="text-muted-foreground">
                  Last purchase: {dup.lastPurchaseAt ? formatDate(dup.lastPurchaseAt) : "None yet"} · Total
                  spending: {formatCurrency(dup.totalSpending)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => router.push(`/customers/${dup.id}`)}
                >
                  Use this customer
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDuplicates(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => {
                setDuplicates(null);
                submitCreate();
              }}
            >
              {saving ? "Saving..." : "Create New Customer Anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
