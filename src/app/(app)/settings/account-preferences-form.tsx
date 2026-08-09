"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAccountPreferencesAction } from "@/lib/actions/account";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AccountPreferencesForm({ mainTradingType }: { mainTradingType: string }) {
  const router = useRouter();
  const [value, setValue] = useState(mainTradingType);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Preferences</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <FormField label="Preferred Market">
          <Select
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
          >
            <option value="FOREX">Forex</option>
            <option value="CRYPTO">Crypto</option>
            <option value="BINARY">Binary</option>
            <option value="STOCKS">Stocks</option>
            <option value="MIXED">Mixed</option>
          </Select>
        </FormField>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await updateAccountPreferencesAction({ mainTradingType: value });
              setSaved(true);
              router.refresh();
            })
          }
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-xs text-positive">Saved</span>}
      </CardContent>
    </Card>
  );
}
