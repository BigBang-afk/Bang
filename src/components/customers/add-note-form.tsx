"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addCustomerNoteAction } from "@/lib/actions/customers.actions";

export function AddNoteForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await addCustomerNoteAction({ customerId, note });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Note added.");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Add a note about this customer..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && note.trim()) handleSubmit();
        }}
      />
      <Button onClick={handleSubmit} disabled={pending || !note.trim()}>
        {pending ? "Adding..." : "Add Note"}
      </Button>
    </div>
  );
}
