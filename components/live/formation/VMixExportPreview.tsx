"use client";

import { useState } from "react";
import { Check, Copy, Radio } from "lucide-react";
import { VMIX_COMMAND_MAP } from "@/lib/vmix/command-map";
import type { PlacedPlayer } from "@/lib/formations";

/**
 * Read-only export preview — the exact payload shape a future vMix export
 * would send, and the command mapping it would use. No network call
 * happens here; "Copy JSON" just copies text to the clipboard. Per the
 * brief: prepare the export architecture, never simulate a connection.
 */
export default function VMixExportPreview({
  teamName,
  formation,
  positions,
  vmixConnected,
  vmixDetail,
}: {
  teamName: string;
  formation: string;
  positions: PlacedPlayer[];
  vmixConnected: boolean;
  vmixDetail?: string;
}) {
  const [copied, setCopied] = useState(false);

  const payload = {
    team: teamName,
    formation,
    players: positions.map((p) => ({
      shirt_number: p.shirtNumber,
      name: p.fullName,
      tactical_position: p.tacticalPosition,
      x_coordinate: p.x,
      y_coordinate: p.y,
      captain: p.captain,
      goalkeeper: p.goalkeeper,
    })),
  };
  const json = JSON.stringify(payload, null, 2);

  function copy() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-panel flex items-center gap-3 p-4">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${vmixConnected ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/30"}`}>
          <Radio size={16} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{vmixConnected ? "vMix connected" : "vMix not configured"}</p>
          <p className="text-xs text-white/35">
            {vmixConnected ? vmixDetail : "Set VMIX_HOST to enable a real connection. This preview works either way — it's the payload shape, not a live send."}
          </p>
        </div>
      </div>

      <div className="surface-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Export Payload Preview</p>
          <button onClick={copy} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-xl bg-black/40 p-4 text-[11px] leading-5 text-white/70">{json}</pre>
      </div>

      <div className="surface-panel p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">vMix Command Mapping</p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(VMIX_COMMAND_MAP).map(([key, cmd]) => (
            <div key={key} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
              <code className="flex-none rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-brand-400">{cmd.function}</code>
              <span className="flex-1 text-white/50">{cmd.note}</span>
              <span className={`flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${cmd.wired ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/25"}`}>
                {cmd.wired ? "Wired" : "Planned"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
