"use client";

import { Radio, EyeOff } from "lucide-react";
import LiveStatusBadge, { type BadgeTone } from "./LiveStatusBadge";

export type GraphicStatus = "ready" | "preview" | "live" | "hidden" | "unavailable";

const STATUS_TONE: Record<GraphicStatus, BadgeTone> = {
  ready: "neutral",
  preview: "warning",
  live: "live",
  hidden: "negative",
  unavailable: "negative",
};

const STATUS_LABEL: Record<GraphicStatus, string> = {
  ready: "Ready",
  preview: "Preview",
  live: "Live",
  hidden: "Hidden",
  unavailable: "Unavailable",
};

export default function BroadcastGraphicCard({
  name,
  status,
  onTake,
  onHide,
}: {
  name: string;
  status: GraphicStatus;
  onTake: () => void;
  onHide: () => void;
}) {
  const disabled = status === "unavailable";

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
        status === "live" ? "border-red-500/30 bg-red-500/[0.06]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white/85">{name}</p>
        <div className="mt-1">
          <LiveStatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} pulse={status === "live"} />
        </div>
      </div>
      <div className="flex flex-none gap-1">
        <button
          type="button"
          onClick={onTake}
          disabled={disabled || status === "live"}
          title={disabled ? "Not available yet" : "Take / Show"}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8 text-white/60 hover:bg-white/15 hover:text-white disabled:opacity-25"
        >
          <Radio size={12} />
        </button>
        <button
          type="button"
          onClick={onHide}
          disabled={disabled || status !== "live"}
          title="Hide"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8 text-white/60 hover:bg-white/15 hover:text-white disabled:opacity-25"
        >
          <EyeOff size={12} />
        </button>
      </div>
    </div>
  );
}
