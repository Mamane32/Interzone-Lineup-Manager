import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { BrandDraft } from "./draft-utils";

const WEIGHT_LABELS = ["light", "normal", "medium", "semibold", "bold"] as const;
const WEIGHT_CLASS: Record<(typeof WEIGHT_LABELS)[number], string> = {
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

// Type scale steps and their real Tailwind rem sizes — matches how
// font-display headings actually get sized elsewhere in the app (text-5xl
// for a page H1, text-2xl for a card title, etc.), not an invented ladder.
const SCALE_STEPS: { label: string; rem: number }[] = [
  { label: "Display", rem: 3 },
  { label: "Heading", rem: 1.875 },
  { label: "Subheading", rem: 1.25 },
  { label: "Body", rem: 1 },
  { label: "Caption", rem: 0.75 },
];

function num(value: BrandDraft[string], fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

/**
 * Real-pipeline typography specimen — rendered inside
 * app/brand-studio-preview (the same iframe route every other preview tab
 * uses), never as a mock. Every example below is the actual component/class
 * the rest of the app uses (Button, Input, .eyebrow, font-display/font-body),
 * so "what you see here" and "what ships" can never drift apart. Letter
 * spacing, line height, paragraph spacing, and text transform reach this
 * specimen the same way corner radius/shadow already do — a scoped
 * `.ggsp-preview-scope` CSS override in PreviewSurface.tsx — so no prop
 * threading is needed for those four; only Font Size Scale (deliberately
 * preview-only, see its token's helperText) is computed here directly.
 */
export default function TypographySpecimen({ draft }: { draft: BrandDraft }) {
  const scale = num(draft.fontSizeScale, 1);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-10">
      <section>
        <p className="eyebrow">Live font size scale</p>
        <div className="mt-4 flex flex-col gap-3">
          {SCALE_STEPS.map((step) => (
            <div key={step.label} className="flex items-baseline gap-4 border-b border-white/[0.06] pb-3">
              <span className="w-24 flex-none font-mono text-[10px] uppercase tracking-wide text-white/30">
                {step.label} · {(step.rem * scale).toFixed(2)}rem
              </span>
              <span className="font-display font-semibold" style={{ fontSize: `${step.rem * scale}rem`, lineHeight: 1.1 }}>
                Aa
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <p className="eyebrow">Specimen</p>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Display</p>
          <p className="font-display text-5xl font-black leading-tight">Championnat Interzone</p>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Heading</p>
          <h2 className="font-display text-3xl font-semibold">Match Center</h2>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Subheading</p>
          <h3 className="font-display text-xl font-semibold text-white/85">Kriminal FC vs Legends FC</h3>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Body</p>
          <p className="max-w-prose text-sm leading-relaxed text-white/70">
            The 5th Edition kicks off with thirty group-stage fixtures across three groups, before the top finishers
            advance to a single-elimination bracket. Every match, lineup, and result feeds the same live standings.
          </p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/70">
            A second paragraph, so Paragraph Spacing has something real to show — the gap above this line is the
            token, not a hardcoded margin.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Caption</p>
          <p className="text-xs text-white/40">Kickoff · 16:00 · Parc Capois La Mort</p>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Label</p>
          <p className="eyebrow">Live Now</p>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Button</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Schedule match</Button>
            <Button variant="secondary">Invite user</Button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/25">Input</p>
          <Input label="Team name" placeholder="e.g. Kriminal FC" defaultValue="" className="max-w-xs" />
        </div>
      </section>

      <section>
        <p className="eyebrow">Font weight</p>
        <div className="mt-3 flex flex-col gap-2">
          {WEIGHT_LABELS.map((w) => (
            <p key={w} className={`font-body text-lg text-white/85 ${WEIGHT_CLASS[w]}`}>
              {w[0].toUpperCase() + w.slice(1)} — The quick brown fox jumps over the lazy dog
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
