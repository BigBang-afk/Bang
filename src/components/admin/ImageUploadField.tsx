"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

export function ImageUploadField({
  label,
  value,
  onChange,
  subdir = "misc",
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  subdir?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subdir", subdir);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) onChange(data.url);
      else alert(data.error ?? "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-brown">{label}</label>}
      {value ? (
        <div className="relative w-32">
          <img src={value} alt="" className="aspect-square w-32 rounded-sm border border-cream-dark object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 rounded-full bg-maroon p-1 text-cream"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="flex w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-gold/40 py-6 text-xs text-brown-light hover:border-gold">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}
