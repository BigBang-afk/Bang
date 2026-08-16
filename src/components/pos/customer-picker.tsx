"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, UserPlus, X, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { searchCustomersAction, createCustomerAction } from "@/lib/actions/sales.actions";
import type { CustomerSearchResult } from "@/services/customer.service";

export function CustomerPicker({
  value,
  onChange,
}: {
  value: CustomerSearchResult | null;
  onChange: (customer: CustomerSearchResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const result = await searchCustomersAction(query);
        if (result.ok) setResults(result.data);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <UserCircle className="size-5 shrink-0 text-gold" />
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">{value.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {value.phone} · {value.purchaseCount} purchase{value.purchaseCount === 1 ? "" : "s"}
              {Number(value.outstandingBalance) > 0 && (
                <> · Owes {formatCurrency(value.outstandingBalance)}</>
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onChange(null)} title="Remove customer">
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer by name or phone (or leave blank for walk-in)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          New
        </Button>
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface-elevated shadow-lg">
          {pending && <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>}
          {!pending && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No customers found.</p>
          )}
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-surface-hover"
              onClick={() => {
                onChange(customer);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium text-foreground">{customer.name}</span>
              <span className="text-xs text-muted-foreground">{customer.phone}</span>
            </button>
          ))}
        </div>
      )}

      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(customer) => {
          onChange(customer);
          setCreateOpen(false);
          setQuery("");
          setOpen(false);
        }}
      />
    </div>
  );
}

function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: CustomerSearchResult) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await createCustomerAction({ name, phone, email: email || undefined });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer added.");
      onCreated({
        id: result.data.id,
        name,
        phone,
        email: email || null,
        outstandingBalance: "0",
        purchaseCount: 0,
      });
      setName("");
      setPhone("");
      setEmail("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new customer</DialogTitle>
          <DialogDescription>A minimal record for this sale — full CRM comes later.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-email">Email (optional)</Label>
            <Input id="customer-email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !name.trim() || !phone.trim()}>
            {pending ? "Adding..." : "Add customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
