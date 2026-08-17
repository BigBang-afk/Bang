"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { GOLD_PURITIES, PURITY_LABELS } from "@/types/gold";
import { recordGoldAdjustmentAction } from "@/lib/actions/gold-ledger.actions";

type PartyOption = { partyType: "KARIGAR" | "SUPPLIER"; partyId: string; label: string };

export function GoldAdjustmentDialog({ parties }: { parties: PartyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [partyKey, setPartyKey] = useState<string>(parties[0] ? `${parties[0].partyType}:${parties[0].partyId}` : "");
  const [purity, setPurity] = useState<(typeof GOLD_PURITIES)[number]>("K21");
  const [direction, setDirection] = useState<"debit" | "credit">("credit");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const [partyType, partyId] = partyKey.split(":");
    if (!partyType || !partyId) {
      toast.error("Select a party.");
      return;
    }
    startTransition(async () => {
      const result = await recordGoldAdjustmentAction({
        partyType,
        partyId,
        purity,
        direction,
        weight: Number(weight),
        description,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Gold adjustment recorded.");
      setOpen(false);
      setWeight("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Scale className="size-4" />
        Record Gold Adjustment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a gold adjustment</DialogTitle>
            <DialogDescription>
              A manual, explicit correction — never automatic. Always include a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="adj-party">Party</Label>
              <Select value={partyKey} onValueChange={setPartyKey}>
                <SelectTrigger id="adj-party">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={`${p.partyType}:${p.partyId}`} value={`${p.partyType}:${p.partyId}`}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="adj-purity">Purity</Label>
                <Select value={purity} onValueChange={(v) => setPurity(v as typeof purity)}>
                  <SelectTrigger id="adj-purity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOLD_PURITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PURITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="adj-direction">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                  <SelectTrigger id="adj-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Increase party&apos;s balance (holds more)</SelectItem>
                    <SelectItem value="credit">Decrease party&apos;s balance (holds less)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-weight">Weight (g)</Label>
              <Input id="adj-weight" type="number" min={0} step="0.001" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-description">Reason</Label>
              <Input id="adj-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Reconciliation correction — physical count" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !weight || !description.trim() || !partyKey}>
              {pending ? "Recording..." : "Record Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
