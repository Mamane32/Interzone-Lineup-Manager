"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

type Format = { key: string; label: string; content: string; filename: string };

export default function ExportPanel({ formats }: { formats: Format[] }) {
  const [active, setActive] = useState(formats[0]?.key);
  const [copied, setCopied] = useState(false);

  const current = formats.find((f) => f.key === active) ?? formats[0];

  async function copy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  function download() {
    if (!current) return;
    const blob = new Blob([current.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = current.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!current) return null;

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-xl bg-ink p-1">
        {formats.map((f) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              f.key === current.key ? "bg-amber-signal text-ink" : "text-ink-muted hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <pre className="max-h-72 overflow-auto rounded-xl border border-ink-line bg-ink p-4 text-sm text-white/90">
{current.content || "—"}
      </pre>

      <div className="mt-3 flex gap-3">
        <Button type="button" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </Button>
        <Button type="button" variant="secondary" onClick={download}>
          Download
        </Button>
      </div>
    </div>
  );
}
