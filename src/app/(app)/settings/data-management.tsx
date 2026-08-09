"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { importBackupAction, resetDataAction } from "@/lib/actions/backup";
import { loadDemoDataAction, deleteDemoDataAction } from "@/lib/actions/demo";
import { Download, Upload, Trash2, Sparkles, XCircle } from "lucide-react";

export function DataManagement() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<null | "import" | "reset" | "demo-load" | "demo-delete">(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFileChosen(file: File) {
    setPendingFile(file);
    setConfirm("import");
  }

  function runConfirmed() {
    setError(null);
    startTransition(async () => {
      let result;
      if (confirm === "import" && pendingFile) {
        const text = await pendingFile.text();
        result = await importBackupAction(text);
      } else if (confirm === "reset") {
        result = await resetDataAction();
      } else if (confirm === "demo-load") {
        result = await loadDemoDataAction();
      } else if (confirm === "demo-delete") {
        result = await deleteDemoDataAction();
      }
      if (result?.error) setError(result.error);
      else {
        setConfirm(null);
        setPendingFile(null);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Data</CardTitle>
          <CardDescription>Backup, restore, or reset your data. Destructive actions always ask for confirmation first.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChosen(file);
            e.target.value = "";
          }}
        />
        <Row
          icon={<Download size={16} />}
          title="Export Backup (JSON)"
          description="Download a complete copy of all your data."
          action={
            <a href="/api/backup/export" download>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </a>
          }
        />
        <Row
          icon={<Upload size={16} />}
          title="Import Backup (JSON)"
          description="Restore from a previously exported backup. This replaces your current data."
          action={
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Import
            </Button>
          }
        />
        <Row
          icon={<Sparkles size={16} />}
          title="Load Demo Data"
          description="Populate the app with sample data so you can see dashboards and reports in action."
          action={
            <Button variant="outline" size="sm" onClick={() => setConfirm("demo-load")}>
              Load Demo Data
            </Button>
          }
        />
        <Row
          icon={<XCircle size={16} />}
          title="Delete Demo Data"
          description="Remove all demo records without touching your real data."
          action={
            <Button variant="outline" size="sm" onClick={() => setConfirm("demo-delete")}>
              Delete Demo Data
            </Button>
          }
        />
        <Row
          icon={<Trash2 size={16} />}
          title="Reset All Data"
          description="Permanently erase all trades, journals, and history. Your login stays intact."
          action={
            <Button variant="negative" size="sm" onClick={() => setConfirm("reset")}>
              Reset Data
            </Button>
          }
        />
      </CardContent>

      <Modal open={confirm !== null} onClose={() => { setConfirm(null); setPendingFile(null); }} title="Are you sure?">
        <p className="text-sm text-muted">
          {confirm === "import" && `This will replace all current data with the contents of "${pendingFile?.name}". This cannot be undone.`}
          {confirm === "reset" && "This will permanently delete all your trading data. This cannot be undone."}
          {confirm === "demo-load" && "This will add sample demo trades, gold purchases, and expenses to your account."}
          {confirm === "demo-delete" && "This will remove all demo-flagged records. Your real data is not affected."}
        </p>
        {error && <p className="mt-2 text-xs text-negative">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setConfirm(null); setPendingFile(null); }}>
            Cancel
          </Button>
          <Button variant={confirm === "reset" || confirm === "import" ? "negative" : "primary"} disabled={pending} onClick={runConfirmed}>
            {pending ? "Working…" : "Confirm"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function Row({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted">{icon}</span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
