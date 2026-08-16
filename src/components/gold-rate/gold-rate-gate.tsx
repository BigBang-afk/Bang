"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GoldRateForm } from "@/components/gold-rate/gold-rate-form";

/**
 * Blocking modal shown to owners/admins when today's gold rates have not
 * been entered yet. Cannot be dismissed without saving — sales, the
 * dashboard, and the calculation engine all depend on a same-day rate.
 */
export function GoldRateGate({ shouldShow }: { shouldShow: boolean }) {
  const [justSaved, setJustSaved] = useState(false);
  const open = shouldShow && !justSaved;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="max-w-xl"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Set Today&apos;s Gold Rates</DialogTitle>
          <DialogDescription>
            Enter today&apos;s per-gram rates before opening the dashboard. You won&apos;t be
            asked again once they&apos;re saved.
          </DialogDescription>
        </DialogHeader>
        <GoldRateForm onSaved={() => setJustSaved(true)} />
      </DialogContent>
    </Dialog>
  );
}
