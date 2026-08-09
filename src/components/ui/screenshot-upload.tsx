"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/input";

export function ScreenshotUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else {
        onChange(json.url);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label>Screenshot</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border-strong bg-surface-2 p-2">
          <button
            type="button"
            onClick={() => setPreview(true)}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border"
          >
            <Image src={value} alt="Screenshot thumbnail" fill className="object-cover" unoptimized />
          </button>
          <span className="flex-1 truncate text-xs text-muted">{value.split("/").pop()}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-accent hover:underline"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted hover:text-negative"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-2 text-xs text-muted hover:border-accent hover:text-accent"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading…" : "Click to upload PNG, JPG or WEBP"}
        </button>
      )}
      {error && <p className="mt-1 text-[11px] text-negative">{error}</p>}

      <Modal open={preview} onClose={() => setPreview(false)} title="Screenshot">
        {value && (
          <div className="relative h-[70vh] w-full">
            <Image src={value} alt="Screenshot" fill className="object-contain" unoptimized />
          </div>
        )}
      </Modal>
    </div>
  );
}
