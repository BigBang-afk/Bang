"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UploaderProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function Uploader({ onFile, disabled }: UploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) return;
      onFile(file);
    },
    [onFile],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) onFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile, disabled]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer
        ${dragActive ? "border-emerald-400 bg-emerald-400/5" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"}
        ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-4xl">📈</div>
      <p className="text-sm font-medium text-slate-200">
        Drop your Quotex chart screenshot here, click to browse, or paste (Ctrl/Cmd+V)
      </p>
      <p className="text-xs text-slate-500">
        Crop tight to just the candlestick area for the most accurate read. PNG/JPG, up to 8MB.
      </p>
    </div>
  );
}
