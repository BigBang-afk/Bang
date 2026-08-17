"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GOLD_PURITIES, PURITY_LABELS } from "@/types/gold";
import { giveGoldToKarigarAction } from "@/lib/actions/karigars.actions";

export function GiveGoldDialog({ karigarId }: { karigarId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purity, setPurity] = useState<(typeof GOLD_PURITIES)[number]>("K21");
  const [weight, setWeight] = useState("");
  const [goldRate, setGoldRate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [jobReference, setJobReference] = useState("");
  const [expectedWeight, setExpectedWeight] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await giveGoldToKarigarAction({
        karigarId,
        purity,
        weight: Number(weight),
        goldRate: Number(goldRate),
        purpose: purpose || undefined,
        jobReference: jobReference || undefined,
        expectedWeight: expectedWeight ? Number(expectedWeight) : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Gold given to karigar recorded.");
      setOpen(false);
      setWeight("");
      setGoldRate("");
      setPurpose("");
      setJobReference("");
      setExpectedWeight("");
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <HandCoins className="size-4" />
        Give Gold to Karigar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give gold to karigar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="give-purity">Purity</Label>
              <Select value={purity} onValueChange={(v) => setPurity(v as typeof purity)}>
                <SelectTrigger id="give-purity">
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
              <Label htmlFor="give-weight">Gold Weight (g)</Label>
              <Input id="give-weight" type="number" min={0} step="0.001" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="give-rate">Gold Rate (per gram)</Label>
              <Input id="give-rate" type="number" min={0} step="0.01" value={goldRate} onChange={(e) => setGoldRate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="give-expected">Expected Return Weight (g, optional)</Label>
              <Input
                id="give-expected"
                type="number"
                min={0}
                step="0.001"
                value={expectedWeight}
                onChange={(e) => setExpectedWeight(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="give-purpose">Purpose</Label>
              <Input id="give-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Ring crafting" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="give-reference">Job Reference</Label>
              <Input id="give-reference" value={jobReference} onChange={(e) => setJobReference(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !weight || !goldRate}>
              {pending ? "Saving..." : "Give Gold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
