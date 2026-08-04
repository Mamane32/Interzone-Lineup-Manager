import SectionHeader from "./SectionHeader";
import LiveStatusBadge, { type BadgeTone } from "./LiveStatusBadge";

type AdState = "scheduled" | "ready" | "live" | "completed";

const STATE_TONE: Record<AdState, BadgeTone> = {
  scheduled: "neutral",
  ready: "warning",
  live: "live",
  completed: "positive",
};

const STATE_LABEL: Record<AdState, string> = {
  scheduled: "Scheduled",
  ready: "Ready",
  live: "Live",
  completed: "Completed",
};

// Generic placeholder content — no real organization or sponsor name is
// hardcoded here (see lib/branding.ts and rule 16 of the brief). A future
// sponsor-management sprint would replace this array with real data; the
// cards below don't change shape.
const SLOTS: { key: string; label: string; sample: string; state: AdState }[] = [
  { key: "active", label: "Active Sponsor", sample: "Sponsored by —", state: "live" },
  { key: "upcoming", label: "Upcoming Sponsor", sample: "Next: —", state: "scheduled" },
  { key: "rotation", label: "Sponsor Rotation", sample: "3 sponsors queued", state: "ready" },
  { key: "lower_third", label: "Lower-third Ad", sample: "Banner — bottom", state: "ready" },
  { key: "full_screen", label: "Full-screen Ad", sample: "Break interstitial", state: "scheduled" },
  { key: "break", label: "Break Sponsor", sample: "Half-time slot", state: "scheduled" },
  { key: "match", label: "Match Sponsor", sample: "Match presented by —", state: "completed" },
];

export default function AdvertisingPanel() {
  return (
    <div className="surface-panel p-4">
      <SectionHeader
        title="Advertising"
        badge={<span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30">Placeholder — no billing/rotation logic</span>}
      />
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {SLOTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/85">{s.label}</p>
              <p className="truncate text-[10px] text-white/35">{s.sample}</p>
            </div>
            <LiveStatusBadge label={STATE_LABEL[s.state]} tone={STATE_TONE[s.state]} pulse={s.state === "live"} />
          </div>
        ))}
      </div>
    </div>
  );
}
