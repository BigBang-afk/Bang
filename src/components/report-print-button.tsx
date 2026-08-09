"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportPrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
      <Printer size={14} /> Print / Save PDF
    </Button>
  );
}
