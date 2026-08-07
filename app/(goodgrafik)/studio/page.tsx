import { Radio } from "lucide-react";
import { WORLDS, ACCENT_CLASSES } from "@/components/goodgrafik/worlds";
import { STUDIO_SECTIONS } from "@/components/goodgrafik/reserved-sections";
import WorldHero from "@/components/goodgrafik/WorldHero";
import ReservedSectionGrid from "@/components/goodgrafik/ReservedSectionGrid";
import InProductionPanel from "@/components/goodgrafik/InProductionPanel";

export const metadata = { title: "Studio" };

const world = WORLDS.find((w) => w.id === "studio")!;
const accent = ACCENT_CLASSES[world.accent];

export default function StudioHomePage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <WorldHero world={world} />

      <div className={`surface-panel mx-auto mt-8 flex max-w-md items-center justify-center gap-2.5 px-4 py-3 ${accent.border}`}>
        <Radio size={15} className={accent.text} />
        <span className="text-xs font-semibold text-white/60">GoodGrafik Radio — not yet on air</span>
      </div>

      <div className="mt-8">
        <ReservedSectionGrid world={world} sections={STUDIO_SECTIONS} />
      </div>

      <div className="mt-10">
        <InProductionPanel
          world={world}
          title="Studio is coming to GoodGrafik"
          description="Original shows, podcasts, live productions, radio and video — every section above is reserved and will open progressively as Studio is built out."
        />
      </div>
    </main>
  );
}
