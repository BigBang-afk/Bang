"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type CustomerStatusValue,
  type CustomerTypeValue,
} from "@/types/customers";
import {
  updateCustomerAction,
  changeCustomerStatusAction,
  changeCustomerTypeAction,
} from "@/lib/actions/customers.actions";

export type EditCustomerInitial = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  address: string;
  city: string;
  dateOfBirth: string;
  anniversaryDate: string;
  preferredLanguage: string;
  notes: string;
  customerType: CustomerTypeValue;
  status: CustomerStatusValue;
};

export function EditCustomerForm({ initial }: { initial: EditCustomerInitial }) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [saving, startSaveTransition] = useTransition();
  const [changingStatus, startStatusTransition] = useTransition();
  const [changingType, startTypeTransition] = useTransition();

  function set<K extends keyof EditCustomerInitial>(key: K, value: EditCustomerInitial[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startSaveTransition(async () => {
      const result = await updateCustomerAction({
        id: fields.id,
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
        notes: fields.notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer updated.");
      router.push(`/customers/${fields.id}`);
    });
  }

  function handleStatusChange(status: CustomerStatusValue) {
    startStatusTransition(async () => {
      const result = await changeCustomerStatusAction({ id: fields.id, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      set("status", status);
      toast.success("Status updated.");
      router.refresh();
    });
  }

  function handleTypeChange(customerType: CustomerTypeValue) {
    startTypeTransition(async () => {
      const result = await changeCustomerTypeAction({ id: fields.id, customerType });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      set("customerType", customerType);
      toast.success("Customer type updated.");
      router.refresh();
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
            <Select value={fields.customerType} onValueChange={(v) => handleTypeChange(v as CustomerTypeValue)}>
              <SelectTrigger disabled={changingType}>
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

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={fields.status} onValueChange={(v) => handleStatusChange(v as CustomerStatusValue)}>
              <SelectTrigger disabled={changingStatus}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {CUSTOMER_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="h-12"
          disabled={saving || !fields.firstName.trim() || !fields.phone.trim()}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Changes"}
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
